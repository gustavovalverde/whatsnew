/**
 * Phase 3: Merge all sources into final result
 */

import { mergeWithCommits } from "./augment-commits.js";
import type { PipelineContext } from "./types.js";

/**
 * Merges primary and commit results into final result.
 *
 * Strategy:
 * - If both exist: merge with deduplication
 * - If only primary: use primary
 * - If only commits: use commits
 * - If neither: returns context unchanged (will throw later)
 *
 * @param ctx - Pipeline context with primary and commit results
 * @returns Updated context with final result
 */
export function mergeSources(ctx: PipelineContext): PipelineContext {
	const { primaryResult, commitResult } = ctx;

	if (primaryResult && commitResult) {
		return {
			...ctx,
			finalResult: mergeWithCommits(primaryResult, commitResult),
		};
	}

	if (primaryResult) {
		return {
			...ctx,
			finalResult: primaryResult,
		};
	}

	if (commitResult) {
		return {
			...ctx,
			finalResult: commitResult,
		};
	}

	// No results - finalResult stays null
	return ctx;
}
