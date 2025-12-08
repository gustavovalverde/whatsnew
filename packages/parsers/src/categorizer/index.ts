/**
 * Universal Categorizer
 *
 * Provides consistent categorization for ALL items regardless
 * of their source format using 4-tier inference:
 *
 * 0. Explicit breaking flag (absolute priority)
 * 1. Conventional commit type (high confidence)
 * 2. Keyword analysis (medium confidence)
 * 3. Source hint fallback (low confidence)
 */

// Main categorization function
export { categorizeItems } from "./categorize.js";

// Inference functions
export {
	extractConventionalCommitType,
	inferItemCategory,
	mapConventionalCommitToCategory,
} from "./inference.js";

// Keyword analysis
export { analyzeKeywords } from "./keywords.js";
// Constants
// Section mapping utilities
export {
	CATEGORY_PRIORITY,
	CATEGORY_SIGNALS,
	CATEGORY_TITLES,
	CONVENTIONAL_COMMIT_MAP,
	KEYWORD_THRESHOLD,
	mapSectionToCategory,
	normalizeSectionName,
	SECTION_TO_CATEGORY_MAP,
} from "./signals.js";
