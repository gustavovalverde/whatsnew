import type { SourceResult } from "@whatsnew/types";
import type { GitHubClient } from "../integrations/github-client.js";

/**
 * DataSource interface for multi-source fallback strategy
 *
 * Each source attempts to fetch release data from a different location:
 * - GitHub Release (primary)
 * - CHANGELOG.md file (secondary)
 * - Commit history (universal fallback)
 */
export interface DataSource {
	/** Source name for identification */
	name: string;

	/** Priority (lower = higher priority) */
	priority: number;

	/**
	 * Minimum confidence threshold for this source to be considered valid
	 * Sources below this threshold will trigger fallback to next source
	 */
	minConfidence: number;

	/**
	 * Attempt to fetch release data from this source
	 * Returns null if source not available or doesn't have data
	 */
	fetch(
		owner: string,
		repo: string,
		tag?: string,
	): Promise<SourceResult | null>;
}

/**
 * Options for creating data sources
 */
export interface DataSourceOptions {
	github: GitHubClient;
}

/**
 * Quality thresholds for fallback decisions
 */
export const QUALITY_THRESHOLDS = {
	/** Minimum confidence for GitHub release to be accepted */
	GITHUB_RELEASE: 0.5,
	/** Minimum confidence for changelog file to be accepted */
	CHANGELOG_FILE: 0.4,
	/** Commits are always available (universal fallback) */
	COMMIT_HISTORY: 0.0,
	/** Minimum body length for a release to be considered "rich" */
	MIN_BODY_LENGTH: 50,
} as const;
