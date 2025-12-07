/**
 * Filter signals and constants for category filtering
 */

import type { CategoryId } from "@whatsnew/types";

/**
 * Categories considered important/user-facing.
 * These are surfaced when filter="important" is applied.
 */
export const IMPORTANT_CATEGORIES: CategoryId[] = [
	"breaking",
	"security",
	"features",
	"fixes",
	"perf",
];

/**
 * Categories considered maintenance/internal.
 * These are surfaced when filter="maintenance" is applied.
 */
export const MAINTENANCE_CATEGORIES: CategoryId[] = [
	"deps",
	"refactor",
	"chore",
	"docs",
	"other",
];
