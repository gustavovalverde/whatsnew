/**
 * Item validator for filtering low-quality changelog items
 *
 * Uses conservative patterns to filter clear noise while
 * avoiding removal of potentially valuable information.
 */

export interface ValidationResult {
	valid: boolean;
	reason?: string;
	score: number; // 0-1 quality score
}

/**
 * Patterns that indicate clear noise (not changelog content)
 *
 * These patterns are conservative - they only match items that are
 * clearly not describing a change (contributor names, merge commits, etc.)
 */
const NOISE_PATTERNS: RegExp[] = [
	// Contributor names
	/^@[\w-]+$/, // Pure @username
	/^\[?@[\w-]+\]?\s*\(https:\/\/github\.com/, // Markdown @username link

	// Git housekeeping
	/^Merge (branch|pull request|remote-tracking)/i, // Merge commits
	/^Merge '[^']+' into/i, // Merge 'branch' into

	// Package versions (dependency lines, not descriptions)
	/^[@\w][\w\-/]*@\d+\.\d+/, // @scope/package@1.2.3 or package@1.2.3

	// Pure emoji (no text content)
	/^:\w+:$/, // :sparkle:, :camera:, etc.
	/^[\p{Emoji}\s]+$/u, // Unicode emoji only

	// Single-word non-descriptive commits
	/^(Update|Polish|Fix|Merge|Cleanup|WIP|Typo|Bump)\s*$/i,

	// Contributor acknowledgment
	/made their first contribution/i,
	/thanks\s+to\s+@[\w-]+/i,
	/contributed\s+by\s+@[\w-]+/i,

	// Version-only entries
	/^v?\d+\.\d+\.\d+(-[\w.]+)?$/, // v1.2.3 or 1.2.3-alpha.1
	/^Version\s+v?\d+\.\d+\.\d+(-[\w.]+)?$/i, // Version 1.2.3

	// Empty or whitespace-only
	/^\s*$/,

	// Just punctuation or special chars
	/^[\p{P}\p{S}\s]+$/u,

	// File path only (no description)
	/^[\w\-/.]+\.(ts|js|tsx|jsx|json|md|yml|yaml)$/,
];

/**
 * Check if text matches any noise pattern
 */
function isNoisePattern(text: string): boolean {
	const trimmed = text.trim();
	return NOISE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * Calculate a quality score for a changelog item
 *
 * @param text - The changelog item text
 * @returns Score between 0 (low quality) and 1 (high quality)
 */
function calculateItemScore(text: string): number {
	const trimmed = text.trim();
	let score = 0.5; // Base score

	// Boost for conventional commit format
	if (
		/^(feat|fix|chore|docs|refactor|perf|test|build|ci|style)\b/i.test(trimmed)
	) {
		score += 0.25;
	}

	// Boost for PR/issue references
	if (/#\d+/.test(trimmed)) {
		score += 0.1;
	}

	// Boost for scope indicator
	if (/^\*\*[\w-]+\*\*:/.test(trimmed) || /^[\w-]+:/.test(trimmed)) {
		score += 0.1;
	}

	// Boost for descriptive length (20-200 chars is ideal)
	if (trimmed.length >= 20 && trimmed.length <= 200) {
		score += 0.1;
	} else if (trimmed.length < 10) {
		score -= 0.3; // Strong penalty for very short items
	} else if (trimmed.length < 20) {
		score -= 0.15;
	}

	// Penalize items with low alphabetic content ratio
	const alphaCount = (trimmed.match(/[a-zA-Z]/g) || []).length;
	const alphaRatio = alphaCount / trimmed.length;
	if (alphaRatio < 0.4) {
		score -= 0.2;
	}

	// Boost for action verbs at start
	if (
		/^(Add|Fix|Update|Remove|Improve|Implement|Support|Enable|Disable|Refactor|Move|Rename|Clean|Bump|Upgrade)/i.test(
			trimmed,
		)
	) {
		score += 0.1;
	}

	return Math.max(0, Math.min(1, score));
}

/**
 * Validate a changelog item for quality
 *
 * @param text - The changelog item text to validate
 * @returns Validation result with validity, reason, and quality score
 *
 * @example
 * ```typescript
 * validateChangelogItem('@alii')
 * // { valid: false, reason: 'noise_pattern', score: 0 }
 *
 * validateChangelogItem('feat(api): add new endpoint (#123)')
 * // { valid: true, score: 0.85 }
 * ```
 */
export function validateChangelogItem(text: string): ValidationResult {
	const trimmed = text.trim();

	// Empty or whitespace-only
	if (!trimmed) {
		return { valid: false, reason: "empty", score: 0 };
	}

	// Too short to be meaningful
	if (trimmed.length < 5) {
		return { valid: false, reason: "too_short", score: 0 };
	}

	// Check for noise patterns
	if (isNoisePattern(trimmed)) {
		return { valid: false, reason: "noise_pattern", score: 0 };
	}

	// Calculate quality score
	const score = calculateItemScore(trimmed);

	// Items with very low score are invalid
	if (score < 0.25) {
		return { valid: false, reason: "low_score", score };
	}

	return { valid: true, score };
}

/**
 * Check if an item is a contributor acknowledgment
 * (useful for section-level filtering)
 */
export function isContributorAcknowledgment(text: string): boolean {
	const trimmed = text.trim().toLowerCase();
	return (
		trimmed.includes("made their first contribution") ||
		trimmed.includes("new contributor") ||
		trimmed.includes("first-time contributor") ||
		/^@[\w-]+$/.test(trimmed) ||
		/^\[?@[\w-]+\]?\s*\(https:\/\/github\.com/.test(text)
	);
}

/**
 * Check if a section header indicates contributor acknowledgments
 */
export function isContributorSection(header: string): boolean {
	const lower = header.toLowerCase();
	return (
		lower.includes("new contributor") ||
		lower.includes("first-time contributor") ||
		lower.includes("first time contributor") ||
		lower.includes("thanks to") ||
		lower.includes("contributors")
	);
}
