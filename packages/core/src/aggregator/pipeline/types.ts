/**
 * Pipeline types for data aggregation
 */

import type { Category, SourceResult } from "@whatsnew/types";
import type { AIExtractor } from "../../ai/ai-extractor.js";
import type { QualityAssessor } from "../../ai/quality-assessor.js";
import type { DataSource } from "../../sources/index.js";

/**
 * Context passed through each pipeline step.
 * Immutable pattern - each step returns a new context.
 */
export interface PipelineContext {
	/** Repository owner */
	readonly owner: string;
	/** Repository name */
	readonly repo: string;
	/** Optional tag to fetch */
	readonly tag?: string;

	/** Primary result from release notes or changelog */
	readonly primaryResult: SourceResult | null;
	/** Commit history result for augmentation */
	readonly commitResult: SourceResult | null;
	/** Final merged result */
	readonly finalResult: SourceResult | null;

	/** Sources that contributed data */
	readonly sourcesUsed: readonly string[];
	/** Whether AI enhancement was applied */
	readonly aiEnhanced: boolean;
}

/**
 * Dependencies injected into pipeline steps
 */
export interface PipelineDependencies {
	readonly sources: readonly DataSource[];
	readonly qualityAssessor: QualityAssessor;
	readonly aiExtractor: AIExtractor;
}

/**
 * Creates a new pipeline context
 */
export function createPipelineContext(
	owner: string,
	repo: string,
	tag?: string,
): PipelineContext {
	return {
		owner,
		repo,
		tag,
		primaryResult: null,
		commitResult: null,
		finalResult: null,
		sourcesUsed: [],
		aiEnhanced: false,
	};
}

/**
 * Helper to add a source to the context
 */
export function addSource(
	ctx: PipelineContext,
	source: string,
): PipelineContext {
	return {
		...ctx,
		sourcesUsed: [...ctx.sourcesUsed, source],
	};
}

/**
 * Type guard for SourceResult
 */
export function hasValidResult(
	result: SourceResult | null,
): result is SourceResult {
	return result !== null && result.categories.length >= 0;
}

/**
 * Type for category map used in merging operations
 */
export type CategoryMap = Map<Category["id"], Category>;
