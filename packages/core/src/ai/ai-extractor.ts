import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import type { Category } from "@whatsnew/types";
import { createGateway, generateObject } from "ai";
import { formatCategoryTitle } from "../utils/metadata.js";
import {
	type Anchors,
	extractAnchors,
	formatAnchorsForPrompt,
} from "./anchor-extractor.js";
import {
	type WNFExtraction,
	WNFExtractionSchema,
} from "./schemas/extraction.schema.js";
import type { AIConfig, AIExtractionResult, AIProvider } from "./types.js";

/**
 * Default models for AI Gateway (format: provider/model)
 */
const DEFAULT_MODEL: Record<AIProvider, string> = {
	anthropic: "anthropic/claude-3-haiku-20240307",
	openai: "openai/gpt-4o-mini",
};

/**
 * AIExtractor uses Vercel AI SDK to extract structured changelog data
 * when deterministic parsing produces low-quality results
 */
export class AIExtractor {
	private readonly config: AIConfig;

	constructor(config: Partial<AIConfig> = {}) {
		this.config = {
			// Auto-enable AI if not explicitly disabled and an API key is present
			enabled: config.enabled ?? true,
			provider: config.provider ?? "anthropic",
			model: config.model,
			confidenceThreshold: config.confidenceThreshold ?? 0.6,
		};
	}

	/**
	 * Check if AI extraction is available
	 *
	 * AI is available when:
	 * - enabled is not explicitly set to false
	 * - At least one AI API key is present in environment
	 *
	 * Supported API keys:
	 * - AI_GATEWAY_API_KEY (Vercel AI Gateway - preferred)
	 * - ANTHROPIC_API_KEY (direct Anthropic API)
	 * - OPENAI_API_KEY (direct OpenAI API)
	 */
	isAvailable(): boolean {
		// If explicitly disabled, return false
		if (this.config.enabled === false) return false;

		// Check for any supported AI API key
		const hasApiKey =
			!!process.env.AI_GATEWAY_API_KEY ||
			!!process.env.ANTHROPIC_API_KEY ||
			!!process.env.OPENAI_API_KEY;

		return hasApiKey;
	}

	/**
	 * Extract structured changelog data from raw release content using AI
	 * Uses grounded generation with pre-extracted anchors for source attribution
	 */
	async extract(rawContent: string): Promise<AIExtractionResult | null> {
		if (!this.isAvailable()) {
			return null;
		}

		try {
			// Pre-extract anchors for grounded generation
			const anchors = extractAnchors(rawContent);

			const model = this.getModel();
			const prompt = this.buildPrompt(rawContent, anchors);

			const { object } = await generateObject({
				model,
				schema: WNFExtractionSchema,
				prompt,
			});

			// Post-validate refs against known anchors
			const validated = this.validateRefs(object, anchors);

			return this.transformResult(validated);
		} catch (error) {
			console.error("AI extraction failed:", error);
			return null;
		}
	}

	/**
	 * Get the AI model instance
	 *
	 * Priority:
	 * 1. AI Gateway (if AI_GATEWAY_API_KEY is set) - preferred, multi-provider support
	 * 2. Direct Anthropic API (if ANTHROPIC_API_KEY is set)
	 * 3. Direct OpenAI API (if OPENAI_API_KEY is set)
	 */
	private getModel() {
		// Use AI Gateway if available (preferred - supports multiple providers)
		if (process.env.AI_GATEWAY_API_KEY) {
			const modelName =
				this.config.model || DEFAULT_MODEL[this.config.provider];
			const gateway = createGateway();
			return gateway(modelName);
		}

		// Fallback to direct Anthropic API
		if (process.env.ANTHROPIC_API_KEY) {
			const anthropic = createAnthropic();
			const modelName =
				this.config.model?.replace("anthropic/", "") ||
				"claude-3-haiku-20240307";
			return anthropic(modelName);
		}

		// Fallback to direct OpenAI API
		if (process.env.OPENAI_API_KEY) {
			const openai = createOpenAI();
			const modelName =
				this.config.model?.replace("openai/", "") || "gpt-4o-mini";
			return openai(modelName);
		}

		// This shouldn't happen if isAvailable() is called first
		throw new Error("No AI API key found in environment");
	}

	/**
	 * Build the extraction prompt with grounding requirements
	 */
	private buildPrompt(rawContent: string, anchors: Anchors): string {
		const anchorsSection = formatAnchorsForPrompt(anchors);

		return `You are a changelog parser. Extract structured information from the following release notes.

IMPORTANT RULES:
1. Only extract information that is explicitly present in the text - do not invent or hallucinate content
2. Categorize changes correctly:
   - "breaking" - Breaking changes that require code modifications
   - "features" - New features, enhancements, improvements
   - "fixes" - Bug fixes, error corrections
   - "security" - Security patches or vulnerabilities
   - "perf" - Performance improvements
   - "deps" - Dependency updates
   - "docs" - Documentation changes
   - "refactor" - Code refactoring without behavior changes
   - "chore" - Maintenance, tooling, CI/CD
   - "other" - Only use if truly uncategorizable
3. Do NOT include contributor names or "New Contributors" sections as changelog items

GROUNDING REQUIREMENTS (CRITICAL):
1. For each change item, include "sourceQuote" - the exact text snippet from the raw content that this item summarizes
2. ONLY use refs from the AVAILABLE_ANCHORS list below - do not invent PR/issue numbers
3. Map each change to its corresponding ref by finding which anchor appears near the sourceQuote
4. Extract refs as NUMBERS ONLY (e.g., "123", "456") - do NOT include the # symbol
5. If a change has no associated ref in the content, leave refs as an empty array

AVAILABLE_ANCHORS (extracted from raw content):
${anchorsSection}

RELEASE NOTES:
${rawContent}

Extract all changes, categorizing them appropriately. Be thorough but accurate. Ensure each item is grounded with a sourceQuote.`;
	}

	/**
	 * Validate refs against known anchors to prevent hallucination
	 * Filters out any refs that weren't in the original content
	 */
	private validateRefs(result: WNFExtraction, anchors: Anchors): WNFExtraction {
		return {
			...result,
			categories: result.categories.map((cat) => ({
				...cat,
				items: cat.items.map((item) => ({
					...item,
					// Filter refs to only include those from known anchors
					refs: (item.refs ?? [])
						.map((ref) => ref.replace(/^#/, "")) // Normalize
						.filter((ref) => anchors.prRefs.includes(ref)),
				})),
			})),
		};
	}

	/**
	 * Transform AI SDK result to our format
	 */
	private transformResult(result: WNFExtraction): AIExtractionResult {
		// Ensure category titles are formatted correctly
		const categories: Category[] = result.categories.map((cat) => ({
			id: cat.id,
			title: formatCategoryTitle(cat.id),
			items: cat.items.map((item) => ({
				text: item.text,
				// Refs already validated and normalized in validateRefs
				refs: item.refs ?? [],
				breaking: item.breaking ?? undefined,
			})),
		}));

		return {
			categories,
			version: result.version ?? undefined,
			hasBreakingChanges: result.hasBreakingChanges,
			notes: result.notes ?? undefined,
		};
	}
}
