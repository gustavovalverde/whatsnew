import {
	categorizeItems,
	extractChangesets,
	extractConventionalCommits,
	extractGeneric,
	extractGitHubAuto,
	extractKeepAChangelog,
	FormatDetector,
} from "@whatsnew/parsers";
import type { Category, ExtractedRelease, SourceResult } from "@whatsnew/types";
import type { GitHubClient } from "../integrations/github-client.js";
import type { DataSource, DataSourceOptions } from "./types.js";
import { QUALITY_THRESHOLDS } from "./types.js";

/**
 * GitHubReleaseSource fetches release data from GitHub Releases API
 * This is the primary source with highest priority
 */
export class GitHubReleaseSource implements DataSource {
	name = "github.release";
	priority = 1;
	minConfidence = QUALITY_THRESHOLDS.GITHUB_RELEASE;

	private readonly github: GitHubClient;
	private readonly formatDetector: FormatDetector;

	constructor(options: DataSourceOptions) {
		this.github = options.github;
		this.formatDetector = new FormatDetector();
	}

	async fetch(
		owner: string,
		repo: string,
		tag?: string,
	): Promise<SourceResult | null> {
		try {
			const release = tag
				? await this.github.getReleaseByTag(owner, repo, tag)
				: await this.github.getLatestReleaseOrNull(owner, repo);

			if (!release) {
				return null;
			}

			// Check if release body has meaningful content
			if (
				!release.body ||
				release.body.trim().length < QUALITY_THRESHOLDS.MIN_BODY_LENGTH
			) {
				// Return low confidence result to trigger fallback
				return {
					categories: [],
					confidence: 0.3,
					source: this.name,
					metadata: {
						version: release.tag_name
							.replace(/^v/, "")
							.replace(/^@?[^@]+@/, ""),
						date: release.published_at,
						rawContent: release.body || "",
					},
				};
			}

			const categories = this.parseReleaseBody(release.body);
			const confidence = this.formatDetector.calculateConfidence(release.body);

			return {
				categories,
				confidence,
				source: this.name,
				metadata: {
					version: release.tag_name.replace(/^v/, "").replace(/^@?[^@]+@/, ""),
					date: release.published_at,
					rawContent: release.body,
				},
			};
		} catch (_error) {
			// Release not found or API error
			return null;
		}
	}

	private parseReleaseBody(body: string): Category[] {
		const format = this.formatDetector.detectFormat(body);

		// Extract items using the appropriate extractor
		let extracted: ExtractedRelease;
		switch (format) {
			case "changesets":
				extracted = extractChangesets(body);
				break;
			case "github-auto":
				extracted = extractGitHubAuto(body);
				break;
			case "keep-a-changelog":
				extracted = extractKeepAChangelog(body);
				break;
			case "conventional-commits":
				extracted = extractConventionalCommits(body);
				break;
			default:
				extracted = extractGeneric(body);
				break;
		}

		// Use universal categorizer
		return categorizeItems(extracted.items);
	}
}
