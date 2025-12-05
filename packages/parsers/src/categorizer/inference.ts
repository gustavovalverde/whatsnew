/**
 * Category inference functions
 *
 * Provides 4-tier category inference:
 * 0. Explicit breaking flag (absolute priority)
 * 1. Conventional commit type (high confidence)
 * 2. Keyword analysis (medium confidence)
 * 3. Source hint fallback (low confidence)
 */

import type {
	CategorizationResult,
	CategoryId,
	ExtractedItem,
} from "@whatsnew/types";
import { analyzeKeywords } from "./keywords.js";
import { CONVENTIONAL_COMMIT_MAP, KEYWORD_THRESHOLD } from "./signals.js";

/**
 * Extracts conventional commit type from text.
 *
 * Supported formats:
 * - "feat(scope): message" -> "feat"
 * - "fix: message" -> "fix"
 * - "chore(deps)!: message" -> "chore"
 * - "[#123](url) fix(core): message" -> "fix"
 */
export function extractConventionalCommitType(text: string): string | null {
	// Pattern 1: type at the start
	const startMatch = text.match(/^(\w+)(?:\s*\([^)]*\))?!?:/);
	if (startMatch) {
		const type = startMatch[1].toLowerCase();
		if (type in CONVENTIONAL_COMMIT_MAP) {
			return type;
		}
	}

	// Pattern 2: After markdown link
	const afterLinkMatch = text.match(
		/^\[[^\]]*\]\([^)]*\)\s*(\w+)(?:\s*\([^)]*\))?!?:/,
	);
	if (afterLinkMatch) {
		const type = afterLinkMatch[1].toLowerCase();
		if (type in CONVENTIONAL_COMMIT_MAP) {
			return type;
		}
	}

	// Pattern 3: Conventional commit anywhere in text
	const anywhereMatch = text.match(
		/\b(feat|fix|chore|docs|refactor|perf|test|build|ci|style|revert)(?:\s*\([^)]*\))?!?:\s/i,
	);
	if (anywhereMatch) {
		const type = anywhereMatch[1].toLowerCase();
		if (type in CONVENTIONAL_COMMIT_MAP) {
			return type;
		}
	}

	return null;
}

/**
 * Maps a conventional commit type to a category ID
 */
export function mapConventionalCommitToCategory(type: string): CategoryId {
	return CONVENTIONAL_COMMIT_MAP[type.toLowerCase()] ?? "other";
}

/**
 * Infers the category for a single extracted item using 4-tier analysis.
 *
 * Tier priority:
 * 0. Explicit breaking flag (absolute priority - from semver Major sections)
 * 1. Conventional commit type (high confidence)
 * 2. Keyword analysis (medium confidence)
 * 3. Source hint fallback (low confidence)
 */
export function inferItemCategory(item: ExtractedItem): CategorizationResult {
	// Tier 0: Explicit breaking flag takes absolute priority
	if (item.breaking) {
		return {
			categoryId: "breaking",
			confidence: "high",
			reason: "explicit_breaking",
		};
	}

	// Tier 1: Use pre-extracted conventional commit type
	if (item.conventionalType) {
		return {
			categoryId: mapConventionalCommitToCategory(item.conventionalType),
			confidence: "high",
			reason: "conventional_commit",
		};
	}

	// Tier 1b: Check text for conventional commit pattern
	const ccType = extractConventionalCommitType(item.text);
	if (ccType) {
		return {
			categoryId: mapConventionalCommitToCategory(ccType),
			confidence: "high",
			reason: "conventional_commit",
		};
	}

	// Tier 2: Keyword analysis (medium confidence)
	const keywordResult = analyzeKeywords(item.text);
	if (keywordResult.score >= KEYWORD_THRESHOLD) {
		return {
			categoryId: keywordResult.category,
			confidence: "medium",
			reason: "keyword_match",
		};
	}

	// Tier 3: Source hint fallback (lowest priority)
	if (item.sourceHint?.suggestedCategory) {
		return {
			categoryId: item.sourceHint.suggestedCategory,
			confidence: "low",
			reason: "source_hint",
		};
	}

	// No signal - default to other
	return {
		categoryId: "other",
		confidence: "low",
		reason: "no_signal",
	};
}
