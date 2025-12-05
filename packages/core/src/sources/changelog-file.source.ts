import { categorizeItems, extractKeepAChangelog } from "@whatsnew/parsers";
import type { SourceResult } from "@whatsnew/types";
import { extractPackageName, extractVersion } from "@whatsnew/utils";
import type { GitHubClient } from "../integrations/github-client.js";
import type { DataSource, DataSourceOptions } from "./types.js";
import { QUALITY_THRESHOLDS } from "./types.js";

/**
 * ChangelogFileSource fetches release data from CHANGELOG.md files
 * This is the secondary source, used when GitHub releases are sparse or missing
 */
export class ChangelogFileSource implements DataSource {
	name = "changelog.md";
	priority = 2;
	minConfidence = QUALITY_THRESHOLDS.CHANGELOG_FILE;

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
			// Get release body if available (for changelog reference extraction)
			let releaseBody: string | undefined;
			if (tag) {
				try {
					const release = await this.github.getReleaseByTag(owner, repo, tag);
					releaseBody = release?.body;
				} catch {
					// Release may not exist, continue without body
				}
			}

			// Extract package name from tag if it's a monorepo tag
			const packageName = tag ? extractPackageName(tag) : undefined;

			// Find changelog file with enhanced options
			const changelog = await this.github.findChangelog(owner, repo, {
				ref: tag,
				packageName: packageName ?? undefined,
				releaseBody,
			});
			if (!changelog) {
				return null;
			}

			// Extract and categorize the changelog content
			// Pass target version to help extractor find the right section
			const targetVersion = tag ? extractVersion(tag) : undefined;
			const extracted = extractKeepAChangelog(changelog.content, targetVersion);

			if (extracted.items.length === 0) {
				return null;
			}

			// Use universal categorizer
			const categories = categorizeItems(extracted.items);

			return {
				categories,
				confidence: extracted.metadata.formatConfidence,
				source: this.name,
				metadata: {
					version: targetVersion,
					rawContent: changelog.content,
				},
			};
		} catch (_error) {
			return null;
		}
	}
}
