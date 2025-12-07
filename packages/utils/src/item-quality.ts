/**
 * Item Quality Scoring for Confidence Calculation
 *
 * Implements a mathematical framework for assessing changelog item quality.
 * Used to calculate composite confidence scores that reflect both structural
 * accuracy AND content utility.
 *
 * @see https://elsevier.blog/composite-scores/ - Composite score methodology
 * @see https://towardsdatascience.com/how-to-quantify-data-quality-743721bdba03/ - Data quality dimensions
 * @see docs/decisions/001-input-quality-limitations.md - ADR for this implementation
 */

/**
 * Result of quality analysis for a single item
 */
export interface ItemQualityResult {
	/** Overall quality score (0-1) */
	score: number;
	/** Structural accuracy component (0-1) */
	structural: number;
	/** Content quality component (0-1) */
	content: number;
	/** Flags indicating quality issues */
	flags: {
		/** Item is very short (<15 chars) */
		terse: boolean;
		/** Item is only generic words (fix, lint, typo) */
		generic: boolean;
		/** Has conventional commit type but no description */
		bareConventional: boolean;
	};
}

/**
 * Aggregate quality metrics for a set of items
 */
export interface AggregateQualityResult {
	/** Average quality score across all items (0-1) */
	averageScore: number;
	/** Average structural score (0-1) */
	averageStructural: number;
	/** Average content score (0-1) */
	averageContent: number;
	/** Ratio of terse items (0-1) */
	terseRatio: number;
	/** Ratio of generic-only items (0-1) */
	genericRatio: number;
	/** Ratio of bare conventional commits (0-1) */
	bareConventionalRatio: number;
	/** Count of items analyzed */
	itemCount: number;
}

/**
 * Composite confidence result with dimensional breakdown
 */
export interface CompositeConfidenceResult {
	/** Final composite confidence score (0-1) */
	composite: number;
	/** Structural accuracy dimension (0-1) - format recognition */
	structural: number;
	/** Content quality dimension (0-1) - item meaningfulness */
	quality: number;
	/** Completeness dimension (0-1) - extraction coverage */
	completeness: number;
	/** Categorization dimension (0-1) - category inference accuracy */
	categorization: number;
	/** Quality metrics for display/debugging */
	metrics: AggregateQualityResult;
}

// =============================================================================
// CONSTANTS - Documented thresholds and weights
// =============================================================================

/**
 * TERSE_THRESHOLD = 15 characters
 *
 * Empirically determined: most meaningful changelog entries are > 15 chars.
 * Examples below threshold: "fix", "lint", "typo", "font size", "sidebar"
 * Examples above: "Fix memory leak in cache" (24 chars)
 */
const TERSE_THRESHOLD = 15;

/**
 * Ideal length range for changelog descriptions.
 *
 * - < 10 chars: Almost certainly too terse to be useful
 * - 10-19 chars: Borderline, might be acceptable
 * - 20-200 chars: Ideal range for descriptive but concise entries
 * - > 200 chars: Verbose, but not severely penalized
 */
const LENGTH_IDEAL_MIN = 20;
const LENGTH_IDEAL_MAX = 200;
const LENGTH_VERY_SHORT = 10;

/**
 * Generic patterns that indicate low-quality entries.
 *
 * These are valid conventional commit types but lack any description.
 * - "fix" = changed something, but WHAT was fixed?
 * - "lint" = formatting changes, but WHERE and WHY?
 * - "typo" = spelling fix, but in WHAT context?
 * - "update" = something changed, provides zero actionable info
 *
 * None tell the user WHAT was actually changed or WHY it matters.
 */
const GENERIC_PATTERNS =
	/^(fix|update|change|typo|lint|minor|misc|wip|cleanup|polish)$/i;

/**
 * Action verbs that indicate good changelog descriptions.
 * Starting with these suggests the author intended to describe the change.
 */
const ACTION_VERB_PATTERN =
	/^(Add|Fix|Update|Remove|Improve|Implement|Support|Enable|Disable|Refactor|Move|Rename|Clean|Bump|Upgrade|Resolve|Prevent|Ensure|Handle|Allow|Avoid|Correct|Restore|Revert)/i;

/**
 * Composite confidence weights.
 *
 * Formula: C = Σ(Cᵢ × wᵢ) / Σ(wᵢ)
 *
 * Weights chosen based on user utility analysis:
 * - Content (35%): Most important for actionability - users need to understand changes
 * - Structure (30%): Indicates extraction reliability - affects overall trust
 * - Completeness (20%): Coverage of actual changes - partial data less useful
 * - Categorization (15%): Classification accuracy - nice-to-have, not critical
 *
 * @see https://elsevier.blog/composite-scores/
 * @see https://pmc.ncbi.nlm.nih.gov/articles/PMC5978518/
 */
const WEIGHTS = {
	/** Weight: 0.35 for content quality - highest weight because user utility
	 * depends more on meaningful descriptions than format correctness.
	 * Source: Data quality research suggests content > structure for actionability.
	 */
	content: 0.35,
	/** Weight: 0.30 for structural accuracy - second highest because it
	 * indicates how reliably we extracted information from the source.
	 */
	structural: 0.3,
	/** Weight: 0.20 for completeness - lower because partial data can still
	 * be useful, even if some changes are missing.
	 */
	completeness: 0.2,
	/** Weight: 0.15 for categorization - lowest because category assignment
	 * is less critical than having accurate descriptions.
	 */
	categorization: 0.15,
} as const;

/**
 * Terse penalty parameters.
 *
 * When many items are terse (>20%), we apply an additional penalty.
 * This is separate from per-item scoring because a few terse items
 * among many good ones is acceptable, but many terse items indicates
 * systematic quality problems with the source.
 *
 * tersePenalty = max(0, (terseRatio - 0.2)) * 0.5
 *
 * Examples:
 * - 10% terse: no penalty (below threshold)
 * - 30% terse: (0.3 - 0.2) * 0.5 = 0.05 penalty
 * - 50% terse: (0.5 - 0.2) * 0.5 = 0.15 penalty
 */
const TERSE_PENALTY_THRESHOLD = 0.2;
const TERSE_PENALTY_MULTIPLIER = 0.5;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

/**
 * Check if text is only generic words with no meaningful content.
 *
 * @param text - The changelog item text
 * @returns true if the text matches generic patterns only
 *
 * @example
 * isGenericOnly("fix") // true
 * isGenericOnly("fix: resolve memory leak") // false
 * isGenericOnly("typo") // true
 */
export function isGenericOnly(text: string): boolean {
	return GENERIC_PATTERNS.test(text.trim());
}

/**
 * Check if text starts with an action verb.
 *
 * @param text - The changelog item text
 * @returns true if text starts with a recognized action verb
 *
 * @example
 * hasActionVerb("Add new feature") // true
 * hasActionVerb("new feature") // false
 * hasActionVerb("Fix memory leak") // true
 */
export function hasActionVerb(text: string): boolean {
	return ACTION_VERB_PATTERN.test(text.trim());
}

/**
 * Check if an item is a bare conventional commit (type only, no description).
 *
 * @param text - The description text (after type/scope extraction)
 * @param conventionalType - The conventional commit type if detected
 * @returns true if this is a bare conventional commit
 *
 * @example
 * isBareConventional("", "fix") // true - "fix" with nothing after
 * isBareConventional("resolve bug", "fix") // false - has description
 * isBareConventional("button", "fix") // borderline - very short description
 */
export function isBareConventional(
	text: string,
	conventionalType?: string,
): boolean {
	if (!conventionalType) return false;

	const trimmed = text.trim();

	// No description at all
	if (trimmed.length === 0) return true;

	// Very short description (< 5 chars) - likely not meaningful
	// Examples: "fix: ui", "fix: a", "chore: x"
	if (trimmed.length < 5) return true;

	return false;
}

// =============================================================================
// SCORING FUNCTIONS
// =============================================================================

/**
 * Calculate structural accuracy score for a single item.
 *
 * Structure requires BOTH format AND substance. A bare "fix" matches
 * the conventional commit regex but provides zero actionable information,
 * so it should NOT receive full structural credit.
 *
 * @param text - The description text
 * @param conventionalType - Conventional commit type if detected
 * @param scope - Scope if detected
 * @returns Structural accuracy score (0-1)
 *
 * @example
 * // Complete conventional commit - full score
 * calculateStructuralScore("resolve token refresh loop", "fix", "auth") // 0.90
 *
 * // Bare conventional type - penalized
 * calculateStructuralScore("", "fix", undefined) // 0.43 (0.85 × 0.5)
 */
export function calculateStructuralScore(
	text: string,
	conventionalType?: string,
	scope?: string,
): number {
	// Base format score for non-conventional text
	let format = 0.5;

	// Conventional commit format detected
	if (conventionalType) {
		format = 0.85;
	}

	// Scope adds structure
	if (scope) {
		format += 0.05;
	}

	// BUT: Penalize incomplete conventional commits
	// "fix" alone is NOT complete - it's format without substance
	// A user cannot understand what changed from "fix" alone.
	// 0.5 chosen to bring score below non-conventional descriptive text (0.60).
	if (isBareConventional(text, conventionalType)) {
		format *= 0.5;
	}

	return clamp(format, 0, 1);
}

/**
 * Calculate content quality score for a single item.
 *
 * Content quality measures how meaningful and actionable the description is.
 * This is the most important dimension for user utility.
 *
 * @param text - The description text
 * @param conventionalType - Conventional commit type if detected
 * @param scope - Scope if detected
 * @param refs - PR/issue references
 * @returns Content quality score (0-1)
 *
 * @example
 * // High quality - descriptive, has refs
 * calculateContentScore("resolve memory leak in cache module", "fix", "core", ["123"])
 * // Returns ~0.85
 *
 * // Low quality - terse, generic
 * calculateContentScore("fix", undefined, undefined, [])
 * // Returns ~0.25
 */
export function calculateContentScore(
	text: string,
	conventionalType?: string,
	scope?: string,
	refs?: string[],
): number {
	const trimmed = text.trim();
	const len = trimmed.length;

	// Base score
	let score = 0.5;

	// Length component (inspired by Flesch formula weighting for complexity)
	// Longer descriptions generally provide more context, but there's a sweet spot.
	if (len >= LENGTH_IDEAL_MIN && len <= LENGTH_IDEAL_MAX) {
		// Ideal length: +0.15
		score += 0.15;
	} else if (len >= LENGTH_VERY_SHORT && len < LENGTH_IDEAL_MIN) {
		// Acceptable but short: +0.05
		score += 0.05;
	} else if (len < LENGTH_VERY_SHORT) {
		// Too terse: -0.35 (strong penalty)
		// Examples: "fix", "lint" - provide zero actionable info
		score -= 0.35;
	} else if (len > LENGTH_IDEAL_MAX) {
		// Too verbose: -0.05 (mild penalty)
		// Long descriptions might be hard to scan but still informative
		score -= 0.05;
	}

	// Structural signals boost content score too
	// These indicate the author took care to structure their message
	if (conventionalType) {
		score += 0.15;
	}
	if (scope) {
		score += 0.1;
	}
	if (refs && refs.length > 0) {
		// PR/issue refs indicate linkable, traceable changes
		score += 0.1;
	}

	// Semantic signals
	if (hasActionVerb(trimmed)) {
		// Action verbs suggest descriptive intent
		score += 0.1;
	}
	if (isGenericOnly(trimmed)) {
		// Generic words only - strong penalty
		// "fix" alone tells user nothing about what changed
		score -= 0.25;
	}

	return clamp(score, 0, 1);
}

/**
 * Calculate quality metrics for a single item.
 *
 * @param item - Object with text, conventionalType, scope, refs
 * @returns Full quality result with scores and flags
 */
export function calculateItemQuality(item: {
	text: string;
	conventionalType?: string;
	scope?: string;
	refs?: string[];
}): ItemQualityResult {
	const { text, conventionalType, scope, refs } = item;
	const trimmed = text.trim();

	const structural = calculateStructuralScore(text, conventionalType, scope);
	const content = calculateContentScore(text, conventionalType, scope, refs);

	// Overall score is weighted average of structural and content
	// Using simplified 60/40 split for per-item scoring
	const score = structural * 0.4 + content * 0.6;

	return {
		score: clamp(score, 0, 1),
		structural,
		content,
		flags: {
			terse: trimmed.length < TERSE_THRESHOLD,
			generic: isGenericOnly(trimmed),
			bareConventional: isBareConventional(text, conventionalType),
		},
	};
}

/**
 * Calculate aggregate quality metrics for a set of items.
 *
 * @param items - Array of items with text, conventionalType, scope, refs
 * @returns Aggregate quality metrics
 */
export function calculateAggregateQuality(
	items: Array<{
		text: string;
		conventionalType?: string;
		scope?: string;
		refs?: string[];
	}>,
): AggregateQualityResult {
	if (items.length === 0) {
		return {
			averageScore: 0,
			averageStructural: 0,
			averageContent: 0,
			terseRatio: 0,
			genericRatio: 0,
			bareConventionalRatio: 0,
			itemCount: 0,
		};
	}

	const results = items.map(calculateItemQuality);

	const totalScore = results.reduce((sum, r) => sum + r.score, 0);
	const totalStructural = results.reduce((sum, r) => sum + r.structural, 0);
	const totalContent = results.reduce((sum, r) => sum + r.content, 0);

	const terseCount = results.filter((r) => r.flags.terse).length;
	const genericCount = results.filter((r) => r.flags.generic).length;
	const bareConventionalCount = results.filter(
		(r) => r.flags.bareConventional,
	).length;

	const n = items.length;

	return {
		averageScore: totalScore / n,
		averageStructural: totalStructural / n,
		averageContent: totalContent / n,
		terseRatio: terseCount / n,
		genericRatio: genericCount / n,
		bareConventionalRatio: bareConventionalCount / n,
		itemCount: n,
	};
}

/**
 * Calculate completeness score.
 *
 * Measures how well we extracted items compared to what's expected.
 *
 * @param extractedCount - Number of items actually extracted
 * @param estimatedCount - Estimated number of items in source
 * @returns Completeness score (0-1)
 */
export function calculateCompleteness(
	extractedCount: number,
	estimatedCount: number,
): number {
	if (estimatedCount <= 0) return 1.0;
	return clamp(extractedCount / estimatedCount, 0, 1);
}

/**
 * Tier scores for categorization confidence.
 *
 * Higher tiers (more explicit signals) get higher scores.
 */
const CATEGORIZATION_TIER_SCORES: Record<string, number> = {
	explicit_breaking: 1.0, // Explicit breaking flag
	conventional_commit: 0.95, // Type from conventional commit
	keyword_match: 0.7, // Matched keywords
	source_hint: 0.5, // Fallback to source section
	no_signal: 0.3, // No categorization signal found
};

/**
 * Calculate categorization confidence score.
 *
 * Based on the distribution of categorization inference tiers.
 *
 * @param inferenceReasons - Array of inference reasons from categorization
 * @returns Categorization confidence (0-1)
 */
export function calculateCategorizationConfidence(
	inferenceReasons: string[],
): number {
	if (inferenceReasons.length === 0) return 0.5;

	const totalScore = inferenceReasons.reduce(
		(sum, reason) => sum + (CATEGORIZATION_TIER_SCORES[reason] ?? 0.5),
		0,
	);

	return totalScore / inferenceReasons.length;
}

/**
 * Calculate composite confidence score.
 *
 * Combines four quality dimensions using weighted average:
 * - Structural (30%): Format recognition correctness
 * - Content (35%): Meaningfulness of descriptions
 * - Completeness (20%): Extraction coverage
 * - Categorization (15%): Category inference accuracy
 *
 * Formula: C = Σ(Cᵢ × wᵢ) / Σ(wᵢ)
 *
 * Additionally applies a terse penalty when too many items lack substance.
 *
 * @param formatConfidence - Format detection confidence from parser
 * @param items - Extracted items for quality analysis
 * @param estimatedItemCount - Estimated number of items (for completeness)
 * @param inferenceReasons - Categorization inference reasons
 * @returns Composite confidence with dimensional breakdown
 *
 * @see https://elsevier.blog/composite-scores/
 * @see docs/decisions/001-input-quality-limitations.md
 */
export function calculateCompositeConfidence(
	formatConfidence: number,
	items: Array<{
		text: string;
		conventionalType?: string;
		scope?: string;
		refs?: string[];
	}>,
	estimatedItemCount?: number,
	inferenceReasons?: string[],
): CompositeConfidenceResult {
	// Calculate aggregate quality metrics
	const metrics = calculateAggregateQuality(items);

	// Calculate individual dimensions
	const structural =
		formatConfidence * (1 - metrics.bareConventionalRatio * 0.3);
	const quality = metrics.averageContent;
	const completeness = calculateCompleteness(
		items.length,
		estimatedItemCount ?? items.length,
	);
	const categorization = calculateCategorizationConfidence(
		inferenceReasons ?? [],
	);

	// Weighted composite score
	let composite =
		structural * WEIGHTS.structural +
		quality * WEIGHTS.content +
		completeness * WEIGHTS.completeness +
		categorization * WEIGHTS.categorization;

	// Apply terse penalty when too many items are terse
	// This is separate from per-item scoring because systematic terse content
	// indicates quality problems with the source, not just individual items.
	const tersePenalty =
		Math.max(0, metrics.terseRatio - TERSE_PENALTY_THRESHOLD) *
		TERSE_PENALTY_MULTIPLIER;
	composite = Math.max(0.3, composite - tersePenalty);

	return {
		composite: clamp(composite, 0, 1),
		structural: clamp(structural, 0, 1),
		quality: clamp(quality, 0, 1),
		completeness: clamp(completeness, 0, 1),
		categorization: clamp(categorization, 0, 1),
		metrics,
	};
}
