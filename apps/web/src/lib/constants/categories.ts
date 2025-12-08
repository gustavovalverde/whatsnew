/**
 * Category constants for changelog display
 * These define the ordering and priority of changelog categories
 */

/** High priority categories that should be expanded by default */
export const HIGH_PRIORITY_CATEGORIES: readonly string[] = [
	"breaking",
	"security",
	"features",
	"fixes",
];

/** Display order for categories (most important first) */
export const PRIORITY_ORDER: readonly string[] = [
	"breaking",
	"security",
	"features",
	"fixes",
	"perf",
	"refactor",
	"deps",
	"docs",
	"chore",
	"other",
];
