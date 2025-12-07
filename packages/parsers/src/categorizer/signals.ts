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
