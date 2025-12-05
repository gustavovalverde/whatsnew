import type { Category } from "@whatsnew/types";

// Re-export Anchors type for convenience
export type { Anchors } from "./anchor-extractor.js";

/**
 * Supported AI providers
 */
export type AIProvider = "anthropic" | "openai";

/**
 * AI configuration options
 *
 * The AI SDK reads API keys from environment variables automatically:
 * - AI_GATEWAY_API_KEY for Vercel AI Gateway
 */
export interface AIConfig {
	enabled: boolean;
	provider: AIProvider;
	/** Model name in format "provider/model" for AI Gateway */
	model?: string;
	confidenceThreshold: number;
}

/**
 * Reasons why AI fallback was triggered
 */
export type FallbackReason =
	| "low_confidence"
	| "all_items_other"
	| "high_other_ratio"
	| "empty_categories"
	| "missing_expected_items";

/**
 * Quality assessment result from QualityAssessor
 */
export interface QualityAssessment {
	score: number;
	shouldFallbackToAI: boolean;
	reasons: FallbackReason[];
}

/**
 * Result from AI extraction
 */
export interface AIExtractionResult {
	categories: Category[];
	version?: string;
	hasBreakingChanges: boolean;
	notes?: Array<{
		type: "migration" | "deprecation" | "upgrade" | "info";
		text: string;
	}>;
}

/**
 * Default models for each provider
 */
export const DEFAULT_MODELS: Record<AIProvider, string> = {
	anthropic: "claude-3-haiku-20240307",
	openai: "gpt-4o-mini",
};
