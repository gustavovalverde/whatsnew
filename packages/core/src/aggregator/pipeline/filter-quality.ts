/**
 * Phase 5: Filter low-quality items
 */

import type { SourceResult } from "@whatsnew/types";
import { validateChangelogItem } from "@whatsnew/utils";
import type { PipelineContext } from "./types.js";

/** Minimum score threshold for items */
const MIN_SCORE = 0.25;

/**
 * Filters low-quality items as final quality gate before output.
 * Catches noise that slipped through earlier filtering.
 *
 * @param ctx - Pipeline context with final result
 * @returns Updated context with filtered result
 */
export function filterQuality(ctx: PipelineContext): PipelineContext {
	if (!ctx.finalResult) {
		return ctx;
	}

	return {
		...ctx,
		finalResult: filterLowQualityItems(ctx.finalResult),
	};
}

/**
 * Filter low-quality items from a source result.
 *
 * @param result - Source result to filter
 * @returns Filtered source result
 */
export function filterLowQualityItems(result: SourceResult): SourceResult {
	const filteredCategories = result.categories
		.map((cat) => ({
			...cat,
			items: cat.items.filter((item) => {
				// Keep items with score above threshold
				if (item.score !== undefined && item.score < MIN_SCORE) {
					return false;
				}

				// Re-validate items without scores (legacy/other sources)
				if (item.score === undefined) {
					const validation = validateChangelogItem(item.text);
					return validation.valid;
				}

				return true;
			}),
		}))
		.filter((cat) => cat.items.length > 0);

	return {
		...result,
		categories: filteredCategories,
	};
}
