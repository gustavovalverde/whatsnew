/**
 * Keyword analysis for category inference
 */

import type { CategoryId } from "@whatsnew/types";
import { escapeRegex } from "@whatsnew/utils";
import { CATEGORY_PRIORITY, CATEGORY_SIGNALS } from "./signals.js";

/**
 * Analyzes text for category signal keywords.
 * Returns the category with highest score.
 */
export function analyzeKeywords(text: string): {
	category: CategoryId;
	score: number;
} {
	const lowerText = text.toLowerCase();
	const words = lowerText.split(/\s+/);

	let bestCategory: CategoryId = "other";
	let bestScore = 0;

	for (const categoryId of CATEGORY_PRIORITY) {
		const signals = CATEGORY_SIGNALS[categoryId];
		let score = 0;

		for (const signal of signals) {
			const signalRegex = new RegExp(`\\b${escapeRegex(signal)}\\b`, "gi");
			const matches = lowerText.match(signalRegex);
			if (matches) {
				score += matches.length;
				// Bonus for appearing at the start
				if (words[0] === signal || words[0]?.startsWith(signal)) {
					score += 0.5;
				}
			}
		}

		if (score > bestScore) {
			bestScore = score;
			bestCategory = categoryId;
		}
	}

	return { category: bestCategory, score: bestScore };
}
