/**
 * @whatsnew/parsers - Changelog format parsing and categorization
 *
 * This package provides:
 * - Format-specific extractors (Keep-a-Changelog, Conventional Commits, Changesets, etc.)
 * - Universal categorizer for consistent item categorization
 * - Format detection utilities
 */

// Universal Categorizer (consistent categorization for all formats)
export {
	analyzeKeywords,
	CATEGORY_PRIORITY,
	CATEGORY_TITLES,
	categorizeItems,
	extractConventionalCommitType,
	inferItemCategory,
	mapConventionalCommitToCategory,
} from "./categorizer/index.js";

// Extractors (extraction-only, no categorization)
export {
	extractChangesets,
	extractConventionalCommits,
	extractGeneric,
	extractGitHubAuto,
	extractGitLabOfficial,
	extractKeepAChangelog,
} from "./extractors/index.js";

// Format Detection
export { type ChangelogFormat, FormatDetector } from "./format-detector.js";
