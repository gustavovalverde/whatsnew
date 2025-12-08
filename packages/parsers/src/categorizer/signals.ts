/**
 * Category signals and constants for categorization
 */

import type { CategoryId } from "@whatsnew/types";

/**
 * Conventional commit types mapped to category IDs
 */
export const CONVENTIONAL_COMMIT_MAP: Record<string, CategoryId> = {
	feat: "features",
	feature: "features",
	fix: "fixes",
	bug: "fixes",
	docs: "docs",
	doc: "docs",
	refactor: "refactor",
	perf: "perf",
	performance: "perf",
	chore: "chore",
	build: "chore",
	ci: "chore",
	style: "other",
	test: "other",
	tests: "other",
	revert: "other",
	breaking: "breaking",
};

/**
 * Keywords that signal specific categories.
 * Order within each category affects matching priority.
 */
export const CATEGORY_SIGNALS: Record<CategoryId, string[]> = {
	features: [
		"add",
		"added",
		"adding",
		"new",
		"introduce",
		"introducing",
		"implement",
		"implemented",
		"support",
		"enable",
		"allow",
		"create",
		"created",
	],
	fixes: [
		"fix",
		"fixes",
		"fixed",
		"fixing",
		"resolve",
		"resolved",
		"bug",
		"issue",
		"error",
		"correct",
		"patch",
		"repair",
		"handle",
	],
	breaking: [
		"breaking",
		"remove",
		"removed",
		"delete",
		"deleted",
		"deprecate",
		"deprecated",
		"migrate",
		"migration",
	],
	perf: [
		"performance",
		"perf",
		"speed",
		"faster",
		"optimize",
		"optimized",
		"efficient",
	],
	deps: ["bump", "upgrade", "dependency", "dependencies"],
	docs: ["document", "documentation", "docs", "readme", "jsdoc", "comment"],
	refactor: [
		"refactor",
		"refactored",
		"restructure",
		"reorganize",
		"cleanup",
		"clean up",
		"consolidate",
		"move",
		"rename",
		"renamed",
	],
	chore: ["chore", "maintain", "maintenance", "internal", "tooling"],
	security: ["security", "vulnerability", "cve", "exploit"],
	other: [],
};

/**
 * Category titles for display
 */
export const CATEGORY_TITLES: Record<CategoryId, string> = {
	breaking: "Breaking Changes",
	features: "New Features",
	fixes: "Bug Fixes",
	security: "Security",
	perf: "Performance",
	deps: "Dependencies",
	docs: "Documentation",
	refactor: "Refactoring",
	chore: "Chores",
	other: "Other Changes",
};

/**
 * Priority order for categories (affects tie-breaking and output order)
 */
export const CATEGORY_PRIORITY: CategoryId[] = [
	"breaking",
	"security",
	"features",
	"fixes",
	"perf",
	"deps",
	"refactor",
	"chore",
	"docs",
	"other",
];

/**
 * Minimum keyword score threshold for medium confidence
 */
export const KEYWORD_THRESHOLD = 1;

/**
 * Maps common section header names to category IDs.
 * Used by extractors as a fallback hint when no other signal is available.
 *
 * Keys should be lowercase, emoji-stripped versions of section titles.
 */
export const SECTION_TO_CATEGORY_MAP: Record<string, CategoryId> = {
	// Features variations
	features: "features",
	"new features": "features",
	"exciting new features": "features",
	enhancements: "features",
	enhancement: "features",
	added: "features",

	// Fixes variations
	"bug fixes": "fixes",
	"bug fix": "fixes",
	bugfixes: "fixes",
	fixes: "fixes",
	fixed: "fixes",

	// Breaking changes
	"breaking changes": "breaking",
	breaking: "breaking",
	removed: "breaking",

	// Security
	security: "security",
	"security fixes": "security",

	// Documentation
	documentation: "docs",
	docs: "docs",

	// Dependencies
	dependencies: "deps",
	"dependency updates": "deps",

	// Performance
	performance: "perf",
	"performance improvements": "perf",

	// Refactoring
	refactoring: "refactor",
	refactor: "refactor",

	// Chores/maintenance
	chore: "chore",
	chores: "chore",
	maintenance: "chore",

	// Other/misc
	other: "other",
	"other changes": "other",
	changes: "other",
	miscellaneous: "other",
	misc: "other",
};

/**
 * Normalizes a section header name for lookup in SECTION_TO_CATEGORY_MAP.
 *
 * @param sectionName - The raw section header name
 * @returns Normalized lowercase name with emojis stripped
 */
export function normalizeSectionName(sectionName: string): string {
	return sectionName
		.toLowerCase()
		.replace(/[\p{Emoji}]/gu, "")
		.trim();
}

/**
 * Maps a section header name to a suggested category ID.
 *
 * @param sectionName - The section header name (e.g., "Bug fixes", "🚀 Features")
 * @returns The suggested category ID, or "other" if not recognized
 */
export function mapSectionToCategory(sectionName: string): CategoryId {
	const normalized = normalizeSectionName(sectionName);
	return SECTION_TO_CATEGORY_MAP[normalized] ?? "other";
}
