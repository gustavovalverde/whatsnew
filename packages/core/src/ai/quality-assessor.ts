import type { Category } from "@whatsnew/types";
import type { FallbackReason, QualityAssessment } from "./types.js";

/**
 * Quality thresholds for AI fallback decisions
 */
const THRESHOLDS = {
	MIN_CONFIDENCE: 0.6,
	MAX_OTHER_RATIO: 0.8,
	MIN_CONTENT_LENGTH: 150,
	MIN_EXTRACTION_RATIO: 0.5,
} as const;

/**
 * QualityAssessor evaluates parsing results to determine if AI fallback is needed
 *
 * Triggers AI fallback when:
 * - Confidence score is below threshold (< 0.6)
 * - All items are categorized as "other" (categorization failed)
 * - High ratio of items in "other" category (> 80%)
 * - Empty categories with substantial content (parsing failed silently)
 */
export class QualityAssessor {
	private readonly confidenceThreshold: number;

	constructor(confidenceThreshold?: number) {
		this.confidenceThreshold = confidenceThreshold ?? THRESHOLDS.MIN_CONFIDENCE;
	}

	/**
	 * Assess parsing quality and determine if AI fallback is needed
	 */
	assess(
		categories: Category[],
		confidence: number,
		rawContentLength: number,
	): QualityAssessment {
		const reasons: FallbackReason[] = [];
		let score = confidence;

		// Check confidence threshold
		if (confidence < this.confidenceThreshold) {
			reasons.push("low_confidence");
			score = Math.min(score, confidence);
		}

		// Count items and "other" items
		const totalItems = categories.reduce(
			(sum, cat) => sum + cat.items.length,
			0,
		);
		const otherCategory = categories.find((cat) => cat.id === "other");
		const otherItems = otherCategory?.items.length ?? 0;

		// Check if all items are in "other"
		if (totalItems > 0 && otherItems === totalItems) {
			reasons.push("all_items_other");
			score = Math.min(score, 0.4);
		}
		// Check high "other" ratio
		else if (
			totalItems > 0 &&
			otherItems / totalItems > THRESHOLDS.MAX_OTHER_RATIO
		) {
			reasons.push("high_other_ratio");
			score = Math.min(score, 0.5);
		}

		// Check empty categories with substantial content
		if (totalItems === 0 && rawContentLength > THRESHOLDS.MIN_CONTENT_LENGTH) {
			reasons.push("empty_categories");
			score = Math.min(score, 0.3);
		}

		// Estimate expected items from content (rough heuristic)
		const expectedItems = this.estimateExpectedItems(rawContentLength);
		if (
			expectedItems > 0 &&
			totalItems / expectedItems < THRESHOLDS.MIN_EXTRACTION_RATIO
		) {
			reasons.push("missing_expected_items");
			score = Math.min(score, 0.5);
		}

		return {
			score,
			shouldFallbackToAI: reasons.length > 0,
			reasons,
		};
	}

	/**
	 * Estimate expected number of items based on content length
	 * Rough heuristic: ~100 chars per changelog item on average
	 */
	private estimateExpectedItems(contentLength: number): number {
		if (contentLength < 100) return 0;
		return Math.floor(contentLength / 150);
	}
}
