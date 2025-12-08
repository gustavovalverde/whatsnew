import { categorizeItems } from "@whatsnew/parsers";
import type {
	ExtractedItem,
	GitHubCommit,
	SourceResult,
} from "@whatsnew/types";
import {
	extractGitHubRefs,
	extractVersion,
	validateChangelogItem,
} from "@whatsnew/utils";
import type { GitHubClient } from "../integrations/github-client.js";
import type { DataSource, DataSourceOptions } from "./types.js";
import { QUALITY_THRESHOLDS } from "./types.js";

/**
 * Conventional commit regex pattern
 */
const CONVENTIONAL_COMMIT_PATTERN = /^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/;

/**
 * Trailing PR/issue reference pattern (e.g., "(#123)" at end of text)
 */
const TRAILING_REF_PATTERN = /\s*\(#\d+\)\s*$/;

/**
 * Extract changelog items from commits
 * This is exported for reuse by getReleasesInRange for range-level augmentation
 */
export function extractItemsFromCommits(
	commits: GitHubCommit[],
): ExtractedItem[] {
	const items: ExtractedItem[] = [];

	for (const commit of commits) {
		const firstLine = commit.commit.message.split("\n")[0];
		const match = firstLine.match(CONVENTIONAL_COMMIT_PATTERN);

		if (match) {
			const [, type, scope, breaking, rawSubject] = match;
			// Strip trailing PR reference from subject to avoid duplication
			const subject = rawSubject.replace(TRAILING_REF_PATTERN, "").trim();
			items.push({
				text: subject,
				refs: extractGitHubRefs(commit.commit.message),
				conventionalType: type.toLowerCase(),
				scope: scope?.trim() || undefined,
				breaking: breaking === "!" || undefined,
				score: 0.8, // High score for structured conventional commits
			});
		} else {
			// Non-conventional commit - validate before adding
			const validation = validateChangelogItem(firstLine);
			if (validation.valid) {
				// Strip trailing PR reference to avoid duplication
				const text = firstLine.replace(TRAILING_REF_PATTERN, "").trim();
				items.push({
					text,
					refs: extractGitHubRefs(commit.commit.message),
					score: validation.score,
				});
			}
			// Skip invalid items (contributor names, merge commits, etc.)
		}
	}

	return items;
}

/**
 * CommitHistorySource fetches release data from git commit history
 * This is the universal fallback - always available as long as commits exist
 */
export class CommitHistorySource implements DataSource {
	name = "commits";
	priority = 3;
	minConfidence = QUALITY_THRESHOLDS.COMMIT_HISTORY;

	private readonly github: GitHubClient;

	constructor(options: DataSourceOptions) {
		this.github = options.github;
	}

	async fetch(
		owner: string,
		repo: string,
		tag?: string,
	): Promise<SourceResult | null> {
		try {
			// Get tags to find version range
			const tags = await this.github.getTags(owner, repo, { perPage: 50 });
			if (tags.length === 0) {
				return null;
			}

			// Determine current and previous tags
			const currentTag = tag || tags[0].name;
			const previousTag = this.findPreviousTag(tags, currentTag);

			// Get commits between tags
			let commits: GitHubCommit[];
			let compareUrl: string | undefined;

			if (previousTag) {
				const comparison = await this.github.compare(
					owner,
					repo,
					previousTag,
					currentTag,
				);
				commits = comparison.commits;
				compareUrl = comparison.html_url;
			} else {
				// No previous tag, get recent commits for the tag
				const comparison = await this.github.compare(
					owner,
					repo,
					`${currentTag}~30`, // 30 commits back
					currentTag,
				);
				commits = comparison.commits;
				compareUrl = comparison.html_url;
			}

			if (commits.length === 0) {
				return null;
			}

			// Extract items from commits
			const items = this.extractItems(commits);

			// Use universal categorizer
			const categories = categorizeItems(items);

			// Calculate confidence based on conventional commits usage
			const hasConventionalCommits = commits.some((c) =>
				CONVENTIONAL_COMMIT_PATTERN.test(c.commit.message.split("\n")[0]),
			);

			return {
				categories,
				confidence: hasConventionalCommits ? 0.75 : 0.6,
				source: this.name,
				metadata: {
					tag: currentTag,
					version: extractVersion(currentTag),
					compareUrl,
					commitCount: commits.length,
				},
			};
		} catch (_error) {
			return null;
		}
	}

	/**
	 * Extract items from commits for categorization
	 * Delegates to the standalone function for reusability
	 */
	private extractItems(commits: GitHubCommit[]): ExtractedItem[] {
		return extractItemsFromCommits(commits);
	}

	/**
	 * Find previous stable tag in the list
	 * Skips pre-release tags to find true previous release
	 */
	private findPreviousTag(
		tags: Array<{ name: string }>,
		currentTag: string,
	): string | null {
		const tagNames = tags.map((t) => t.name);
		const currentIndex = tagNames.indexOf(currentTag);

		if (currentIndex === -1 || currentIndex === tagNames.length - 1) {
			return null;
		}

		const isCurrentStable = !this.isPreReleaseTag(currentTag);

		for (let i = currentIndex + 1; i < tagNames.length; i++) {
			const candidateTag = tagNames[i];
			if (isCurrentStable) {
				if (!this.isPreReleaseTag(candidateTag)) {
					return candidateTag;
				}
			} else {
				return candidateTag;
			}
		}

		return null;
	}

	/**
	 * Check if a tag represents a pre-release version
	 */
	private isPreReleaseTag(tag: string): boolean {
		const preReleasePatterns = [
			/-rc\./i,
			/-rc\d/i,
			/-alpha/i,
			/-beta/i,
			/-canary/i,
			/-preview/i,
			/-dev/i,
			/-next/i,
			/-nightly/i,
		];
		return preReleasePatterns.some((pattern) => pattern.test(tag));
	}
}
