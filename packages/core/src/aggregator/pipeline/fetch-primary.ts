/**
 * Phase 1: Fetch primary sources (release notes, changelog)
 */

import type { DataSource } from "../../sources/index.js";
import { addSource, type PipelineContext } from "./types.js";

/**
 * Fetches from primary sources (release notes, changelog).
 * Skips commit history which is handled separately.
 *
 * @param ctx - Pipeline context
 * @param sources - Available data sources
 * @returns Updated context with primary result
 */
export async function fetchPrimary(
	ctx: PipelineContext,
	sources: readonly DataSource[],
): Promise<PipelineContext> {
	let primaryResult = ctx.primaryResult;
	let updatedCtx = ctx;

	for (const source of sources) {
		// Commit history is handled separately for augmentation
		if (source.name === "commits") {
			continue;
		}

		try {
			const result = await source.fetch(ctx.owner, ctx.repo, ctx.tag);

			if (result && result.confidence >= source.minConfidence) {
				// Found a good primary source
				primaryResult = result;
				updatedCtx = addSource(updatedCtx, source.name);
				break;
			}

			// Store as fallback if better than current
			if (
				result &&
				(!primaryResult || result.confidence > primaryResult.confidence)
			) {
				primaryResult = result;
				updatedCtx = addSource(updatedCtx, source.name);
			}
		} catch (error) {
			console.error(
				`Error fetching from ${source.name}:`,
				error instanceof Error ? error.message : error,
			);
		}
	}

	return {
		...updatedCtx,
		primaryResult,
	};
}
