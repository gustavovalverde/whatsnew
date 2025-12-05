/**
 * Phase 4: AI enhancement for low-quality results
 */

import type { Category, SourceResult } from "@whatsnew/types";
import type { AIExtractor } from "../../ai/ai-extractor.js";
import type { QualityAssessor } from "../../ai/quality-assessor.js";
import { addSource, type PipelineContext } from "./types.js";

/**
 * Enhances result with AI extraction if quality is low.
 *
 * @param ctx - Pipeline context with final result
 * @param qualityAssessor - Quality assessor instance
 * @param aiExtractor - AI extractor instance
 * @returns Updated context, potentially with AI-enhanced result
 */
export async function enhanceWithAI(
	ctx: PipelineContext,
	qualityAssessor: QualityAssessor,
	aiExtractor: AIExtractor,
): Promise<PipelineContext> {
	if (!ctx.finalResult) {
		return ctx;
	}

	const rawContent = ctx.finalResult.metadata?.rawContent || "";
	const assessment = qualityAssessor.assess(
		ctx.finalResult.categories,
		ctx.finalResult.confidence,
		rawContent.length,
	);

	if (
		!assessment.shouldFallbackToAI ||
		!aiExtractor.isAvailable() ||
		!rawContent
	) {
		return ctx;
	}

	const aiResult = await aiExtractor.extract(rawContent);

	if (!aiResult || aiResult.categories.length === 0) {
		return ctx;
	}

	const mergedResult = mergeAIResults(ctx.finalResult, aiResult);

	return {
		...addSource(ctx, "ai"),
		finalResult: mergedResult,
		aiEnhanced: true,
	};
}

/**
 * Merge AI extraction results with deterministic results.
 * Preserves refs from deterministic parsing while using AI categories.
 *
 * @param deterministicResult - Result from deterministic parsing
 * @param aiResult - Result from AI extraction
 * @returns Merged source result
 */
function mergeAIResults(
	deterministicResult: SourceResult,
	aiResult: { categories: Category[]; hasBreakingChanges: boolean },
): SourceResult {
	// Collect ALL refs from deterministic result
	const allDeterministicRefs = new Set<string>();
	for (const cat of deterministicResult.categories) {
		for (const item of cat.items) {
			if (item.refs) {
				for (const ref of item.refs) {
					allDeterministicRefs.add(ref);
				}
			}
		}
	}

	// Merge refs into AI categories
	const mergedCategories = aiResult.categories.map((cat) => ({
		...cat,
		items: cat.items.map((item) => ({
			...item,
			refs: item.refs || [],
		})),
	}));

	return {
		...deterministicResult,
		categories: mergedCategories,
		confidence: Math.max(deterministicResult.confidence, 0.8),
	};
}
