/**
 * @whatsnew/utils - Shared utilities for the What's New platform
 *
 * This package provides common utilities used across all @whatsnew packages:
 * - Result type for explicit error handling
 * - Text normalization functions
 * - Reference extraction (GitHub/GitLab)
 * - Version parsing and extraction
 * - Breaking change detection
 */

// Breaking change detection
export {
	BREAKING_INDICATORS,
	extractBreakingDescription,
	hasBreakingMarker,
	isBreakingChange,
	isMajorSection,
} from "./breaking.js";
// Regex utilities
export { escapeRegex } from "./escape-regex.js";

// Reference extraction
export {
	extractGitHubRefs,
	extractGitLabRefs,
	extractRefs,
	stripTrailingRefs,
} from "./extract-refs.js";
// Item validation
export {
	isContributorAcknowledgment,
	isContributorSection,
	type ValidationResult,
	validateChangelogItem,
} from "./item-validator.js";
// Text normalization
export {
	normalizeForComparison,
	normalizeForDeduplication,
	normalizeLineEndings,
	normalizeWhitespace,
} from "./normalize.js";
// Result type for explicit error handling
export {
	err,
	mapError,
	mapResult,
	ok,
	type Result,
	tryCatch,
	tryCatchAsync,
	unwrap,
	unwrapOr,
} from "./result.js";
// Version utilities
export {
	extractPackageName,
	extractVersion,
	isMonorepoTag,
	parseVersion,
} from "./version.js";
