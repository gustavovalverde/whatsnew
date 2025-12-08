import {
	// New architecture: extractors + categorizer
	categorizeItems,
	extractChangesets,
	extractConventionalCommits,
	extractGeneric,
	extractGitHubAuto,
	extractKeepAChangelog,
	FormatDetector,
} from "@whatsnew/parsers";
import type {
	ExtractedRelease,
	ReleasesInRangeOptions,
	WNFAggregatedDocument,
	WNFDocument,
} from "@whatsnew/types";
import { DataAggregator } from "../aggregator/data-aggregator.js";
import type { AIConfig } from "../ai/types.js";
import {
	GitHubClient,
	type GitHubClientOptions,
} from "../integrations/github-client.js";
import { CommitHistorySource } from "../sources/commit-history.source.js";
import { extractSummary } from "../utils/metadata.js";
import {
	buildAggregatedSummary,
	normalizeDateRange,
	PackageAggregator,
	type ParsedRelease,
} from "./range/index.js";

export interface ReleaseServiceOptions extends GitHubClientOptions {
	/**
	 * Optional custom GitHub client (for testing or custom implementations)
	 */
	githubClient?: GitHubClient;
	/**
	 * Enable multi-source fallback strategy (default: true)
	 * When true, will try CHANGELOG.md and commit history if GitHub release is sparse
	 * Set to false for single-source mode (GitHub releases only)
	 */
	enableFallback?: boolean;
	/**
	 * AI Smart Fallback configuration
	 * When provided with enabled: true, uses AI to improve low-quality parsing results
	 */
	ai?: Partial<AIConfig>;
}

/**
 * Result from getUnreleasedChanges including document and metadata
 */
export interface UnreleasedResult {
	/** The WNF document for unreleased changes */
	document: WNFDocument;
	/** Metadata about the unreleased state */
	metadata: {
		/** Tag of the baseline release (undefined if no releases) */
		baselineTag?: string;
		/** Number of commits since baseline */
		commitCount: number;
		/** Date of baseline release */
		baselineDate?: string;
	};
}

/**
 * ReleaseService orchestrates fetching and transforming GitHub releases into WNF format
 *
 * This service coordinates between:
 * - GitHub API client for fetching release data
 * - Format detector for identifying changelog format
 * - Parsers for extracting structured change information
 * - Metadata extractors for summary and version information
 */
export class ReleaseService {
	private readonly github: GitHubClient;
	private readonly formatDetector: FormatDetector;
	private readonly aggregator: DataAggregator | null;
	private readonly enableFallback: boolean;

	constructor(options: ReleaseServiceOptions = {}) {
		this.github = options.githubClient || new GitHubClient(options);
		this.formatDetector = new FormatDetector();
		this.enableFallback = options.enableFallback ?? true;
		this.aggregator = this.enableFallback
			? new DataAggregator({ github: this.github, ai: options.ai })
			: null;
	}

	/**
	 * Fetches the latest release and converts it to WNF format
	 *
	 * @param owner - GitHub repository owner
	 * @param repo - GitHub repository name
	 * @param packageName - Optional package name for monorepo filtering
	 * @returns WNF document containing structured release information
	 */
	async getLatestReleaseWNF(
		owner: string,
		repo: string,
		packageName?: string,
	): Promise<WNFDocument> {
		// Use aggregator with multi-source fallback if enabled
		if (this.aggregator && !packageName) {
			return this.aggregator.getRelease(owner, repo);
		}

		let release: Awaited<ReturnType<typeof this.github.getLatestRelease>>;

		// If package name provided, find latest release for that package
		if (packageName) {
			const releases = await this.github.getRecentReleases(owner, repo, {
				packageFilter: packageName,
				perPage: 10,
			});

			if (releases.length === 0) {
				throw new Error(`No releases found for package: ${packageName}`);
			}

			release = releases[0];
		} else {
			// Default behavior: get latest release
			release = await this.github.getLatestRelease(owner, repo);
		}

		const wnf: WNFDocument = {
			spec: "wnf/0.1",
			source: {
				platform: "github",
				repo: `${owner}/${repo}`,
				tag: release.tag_name,
			},
			version: release.tag_name.replace(/^v/, "").replace(/^@?[^@]+@/, ""),
			releasedAt: release.published_at,
			summary: extractSummary(release.body),
			categories: this.parseReleaseBody(release.body),
			links: {
				release: release.html_url,
			},
			confidence: this.formatDetector.calculateConfidence(release.body),
			generatedFrom: ["github.release"],
			generatedAt: new Date().toISOString(),
		};

		return wnf;
	}

	/**
	 * Fetches a specific release by tag and converts it to WNF format
	 *
	 * @param owner - GitHub repository owner
	 * @param repo - GitHub repository name
	 * @param tag - The release tag
	 * @returns WNF document containing structured release information
	 */
	async getReleaseByTagWNF(
		owner: string,
		repo: string,
		tag: string,
	): Promise<WNFDocument> {
		// Use aggregator with multi-source fallback if enabled
		if (this.aggregator) {
			return this.aggregator.getReleaseByTag(owner, repo, tag);
		}

		const release = await this.github.getReleaseByTag(owner, repo, tag);

		const wnf: WNFDocument = {
			spec: "wnf/0.1",
			source: {
				platform: "github",
				repo: `${owner}/${repo}`,
				tag: release.tag_name,
			},
			version: release.tag_name.replace(/^v/, "").replace(/^@?[^@]+@/, ""),
			releasedAt: release.published_at,
			summary: extractSummary(release.body),
			categories: this.parseReleaseBody(release.body),
			links: {
				release: release.html_url,
			},
			confidence: this.formatDetector.calculateConfidence(release.body),
			generatedFrom: ["github.release"],
			generatedAt: new Date().toISOString(),
		};

		return wnf;
	}

	/**
	 * Detect if repository is a monorepo
	 */
	async detectMonorepo(
		owner: string,
		repo: string,
	): Promise<{ isMonorepo: boolean; packages: string[] }> {
		return this.github.detectMonorepo(owner, repo);
	}

	/**
	 * Fetches all releases within a date range and aggregates them into a single WNF document.
	 * Uses package-first structure for proper monorepo support.
	 *
	 * @param owner - GitHub repository owner
	 * @param repo - GitHub repository name
	 * @param options - Date range and optional package filter
	 * @returns Aggregated WNF document with package-grouped changes
	 */
	async getReleasesInRange(
		owner: string,
		repo: string,
		options: ReleasesInRangeOptions,
	): Promise<WNFAggregatedDocument> {
		const { since, until } = normalizeDateRange(options.since, options.until);

		const releases = await this.github.getReleasesInRange(owner, repo, {
			since,
			until,
			packageFilter: options.packageFilter,
		});

		if (releases.length === 0) {
			return this.buildEmptyRangeResult(owner, repo, since, until, options);
		}

		// Pre-parse releases with async changelog resolution
		const parsedReleases = await this.parseReleasesForAggregation(
			owner,
			repo,
			releases,
		);

		// Aggregate by package
		const aggregator = new PackageAggregator(repo);
		const { packages, allReleaseSummaries } =
			aggregator.aggregate(parsedReleases);

		// Calculate confidence and summary
		const avgConfidence =
			packages.length > 0
				? packages.reduce((sum, pkg) => sum + pkg.confidence, 0) /
					packages.length
				: 0;

		const summary = buildAggregatedSummary(packages, releases.length);

		return {
			spec: "wnf/0.1",
			source: {
				platform: "github",
				repo: `${owner}/${repo}`,
				dateRange: {
					since: since.toISOString(),
					until: until.toISOString(),
				},
				packageFilter: options.packageFilter,
			},
			summary,
			packages,
			releases: allReleaseSummaries,
			releaseCount: releases.length,
			links: {
				releases: `https://github.com/${owner}/${repo}/releases`,
			},
			confidence: avgConfidence,
			generatedFrom: ["github.releases"],
			generatedAt: new Date().toISOString(),
		};
	}

	/**
	 * Pre-parses GitHub releases for aggregation.
	 * Resolves changelog references and parses bodies into categories.
	 */
	private async parseReleasesForAggregation(
		owner: string,
		repo: string,
		releases: Awaited<ReturnType<typeof this.github.getReleasesInRange>>,
	): Promise<ParsedRelease[]> {
		return Promise.all(
			releases.map(async (release) => {
				const body = await this.fetchChangelogIfReference(
					owner,
					repo,
					release.body || "",
					release.tag_name,
				);

				return {
					tag_name: release.tag_name,
					published_at: release.published_at,
					html_url: release.html_url,
					categories: this.parseReleaseBody(body),
					confidence: this.formatDetector.calculateConfidence(body),
				};
			}),
		);
	}

	/**
	 * Builds an empty result for when no releases are found in range.
	 */
	private buildEmptyRangeResult(
		owner: string,
		repo: string,
		since: Date,
		until: Date,
		options: ReleasesInRangeOptions,
	): WNFAggregatedDocument {
		return {
			spec: "wnf/0.1",
			source: {
				platform: "github",
				repo: `${owner}/${repo}`,
				dateRange: {
					since: since.toISOString(),
					until: until.toISOString(),
				},
				packageFilter: options.packageFilter,
			},
			summary: "No releases found in the specified date range",
			packages: [],
			releases: [],
			releaseCount: 0,
			links: {
				releases: `https://github.com/${owner}/${repo}/releases`,
			},
			confidence: 0,
			generatedFrom: ["github.releases"],
			generatedAt: new Date().toISOString(),
		};
	}

	/**
	 * Get the underlying GitHub client for advanced operations
	 */
	getGitHubClient(): GitHubClient {
		return this.github;
	}

	/**
	 * Fetches unreleased changes (commits since last release to HEAD)
	 *
	 * @param owner - GitHub repository owner
	 * @param repo - GitHub repository name
	 * @param options - Configuration options
	 * @returns WNF document with unreleased changes and metadata
	 */
	async getUnreleasedChanges(
		owner: string,
		repo: string,
		options?: {
			includePrerelease?: boolean;
			packageFilter?: string;
		},
	): Promise<UnreleasedResult> {
		const commitSource = new CommitHistorySource({ github: this.github });

		// Find baseline release
		const baselineRelease = options?.includePrerelease
			? await this.github.getLatestReleaseOrNull(owner, repo)
			: await this.github.getLatestStableRelease(owner, repo, {
					packageFilter: options?.packageFilter,
				});

		// Fetch unreleased commits
		const result = await commitSource.fetchUnreleased(owner, repo, options);

		if (!result) {
			// No unreleased commits
			return this.buildEmptyUnreleasedResult(owner, repo, baselineRelease);
		}

		const document: WNFDocument = {
			spec: "wnf/0.1",
			source: {
				platform: "github",
				repo: `${owner}/${repo}`,
				tag: baselineRelease?.tag_name,
			},
			version: "unreleased",
			releasedAt: undefined,
			summary: this.buildUnreleasedSummary(
				result.categories,
				result.metadata?.commitCount ?? 0,
			),
			categories: result.categories,
			links: {
				compare: result.metadata?.compareUrl,
			},
			confidence: result.confidence,
			generatedFrom: ["commits.unreleased"],
			generatedAt: new Date().toISOString(),
		};

		return {
			document,
			metadata: {
				baselineTag: baselineRelease?.tag_name,
				commitCount: result.metadata?.commitCount ?? 0,
				baselineDate: baselineRelease?.published_at ?? undefined,
			},
		};
	}

	/**
	 * Get count of unreleased commits for smart hints
	 * Efficient - only fetches comparison metadata, not full commit data
	 *
	 * @param owner - GitHub repository owner
	 * @param repo - GitHub repository name
	 * @param baseTag - Optional specific tag to compare against (defaults to latest stable)
	 * @returns Number of commits since the baseline
	 */
	async getUnreleasedCommitCount(
		owner: string,
		repo: string,
		baseTag?: string,
	): Promise<number> {
		try {
			const tag =
				baseTag ||
				(await this.github.getLatestStableRelease(owner, repo))?.tag_name;

			if (!tag) {
				return 0; // No baseline to compare against
			}

			const comparison = await this.github.compareToHead(owner, repo, tag);
			return comparison.total_commits;
		} catch {
			return 0; // Silently return 0 on error (hint is optional)
		}
	}

	/**
	 * Builds summary text for unreleased changes
	 */
	private buildUnreleasedSummary(
		categories: WNFDocument["categories"],
		commitCount: number,
	): string {
		const itemCount = categories.reduce((sum, c) => sum + c.items.length, 0);
		const breakingCount =
			categories.find((c) => c.id === "breaking")?.items.length ?? 0;

		let summary = `${commitCount} commits with ${itemCount} changes since last release`;
		if (breakingCount > 0) {
			summary += ` (${breakingCount} breaking)`;
		}
		return summary;
	}

	/**
	 * Builds empty result when no unreleased commits exist
	 */
	private buildEmptyUnreleasedResult(
		owner: string,
		repo: string,
		baseline: Awaited<
			ReturnType<typeof this.github.getLatestStableRelease>
		> | null,
	): UnreleasedResult {
		return {
			document: {
				spec: "wnf/0.1",
				source: {
					platform: "github",
					repo: `${owner}/${repo}`,
					tag: baseline?.tag_name,
				},
				version: "unreleased",
				releasedAt: undefined,
				summary: baseline
					? `No unreleased changes since ${baseline.tag_name}`
					: "No releases found",
				categories: [],
				links: {},
				confidence: 1.0,
				generatedFrom: ["commits.unreleased"],
				generatedAt: new Date().toISOString(),
			},
			metadata: {
				baselineTag: baseline?.tag_name,
				commitCount: 0,
				baselineDate: baseline?.published_at ?? undefined,
			},
		};
	}

	/**
	 * Check if a release body is just a changelog reference
	 * Pattern: "Please refer to [CHANGELOG.md](URL) for details."
	 */
	private isChangelogReference(body: string): boolean {
		// Check if body is short and contains a CHANGELOG reference
		if (body.length > 300) return false;

		const changelogRefPattern =
			/\[CHANGELOG(?:\.md)?\]\(https:\/\/github\.com\/[^)]+\)/i;
		return changelogRefPattern.test(body);
	}

	/**
	 * Fetch actual changelog content if release body is just a reference
	 * Uses the enhanced findChangelog method with release body parsing
	 */
	private async fetchChangelogIfReference(
		owner: string,
		repo: string,
		body: string,
		tag: string,
	): Promise<string> {
		if (!this.isChangelogReference(body)) {
			return body;
		}

		// Use findChangelog with release body to extract the path
		const changelog = await this.github.findChangelog(owner, repo, {
			ref: tag,
			releaseBody: body,
		});

		if (changelog) {
			return changelog.content;
		}

		// Fallback to original body if changelog not found
		return body;
	}

	/**
	 * Parses release body using the new extract→categorize architecture.
	 *
	 * This method implements separation of concerns:
	 * 1. Extract: Format-specific extractors pull items with metadata
	 * 2. Categorize: Universal categorizer applies consistent logic to ALL items
	 *
	 * @param body - The release body text
	 * @returns Categorized change items in WNF format
	 */
	private parseReleaseBody(body: string): WNFDocument["categories"] {
		const format = this.formatDetector.detectFormat(body);

		// Phase 1: Extract items (format-specific)
		const extracted = this.extract(body, format);

		// Phase 2: Categorize items (universal, consistent across all formats)
		return categorizeItems(extracted.items);
	}

	/**
	 * Extracts items from the release body using the appropriate extractor.
	 *
	 * Each extractor knows how to parse its specific format and returns
	 * ExtractedItem[] with metadata (refs, sourceHint, conventionalType, etc.)
	 * but does NOT assign final categories.
	 *
	 * @param body - The release body text
	 * @param format - The detected format type
	 * @returns ExtractedRelease with items and metadata
	 */
	private extract(
		body: string,
		format: ReturnType<FormatDetector["detectFormat"]>,
	): ExtractedRelease {
		switch (format) {
			case "changesets":
				return extractChangesets(body);
			case "github-auto":
				return extractGitHubAuto(body);
			case "keep-a-changelog":
				return extractKeepAChangelog(body);
			case "conventional-commits":
				return extractConventionalCommits(body);
			default:
				return extractGeneric(body);
		}
	}
}
