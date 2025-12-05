/**
 * Breaking change detection utilities
 *
 * These functions detect breaking changes from various indicators in changelog text.
 */

/**
 * Breaking change indicators in commit messages/changelog entries
 */
export const BREAKING_INDICATORS = {
	/** Conventional commit breaking marker (suffix on type) */
	conventionalMarker: /^[a-z]+(?:\([^)]+\))?!:/i,

	/** BREAKING CHANGE footer (conventional commits spec) */
	breakingChangeFooter: /^BREAKING[- ]CHANGE:/im,

	/** Breaking change mentioned in text */
	breakingKeyword: /\bbreaking\s*change/i,

	/** Major version indicator in changesets */
	majorSection: /^#+\s*major\s+changes?/im,
} as const;

/**
 * Detects if text indicates a breaking change
 *
 * Checks for:
 * - Conventional commit `!` marker (e.g., `feat!:`, `fix(scope)!:`)
 * - `BREAKING CHANGE:` or `BREAKING-CHANGE:` footer
 * - `breaking change` mentioned in text
 *
 * @example
 * ```typescript
 * isBreakingChange("feat!: remove deprecated API"); // true
 * isBreakingChange("BREAKING CHANGE: new config format"); // true
 * isBreakingChange("This is a breaking change"); // true
 * isBreakingChange("fix: minor bug"); // false
 * ```
 */
export function isBreakingChange(text: string): boolean {
	return (
		BREAKING_INDICATORS.conventionalMarker.test(text) ||
		BREAKING_INDICATORS.breakingChangeFooter.test(text) ||
		BREAKING_INDICATORS.breakingKeyword.test(text)
	);
}

/**
 * Detects breaking markers in a conventional commit message
 *
 * Specifically checks for the `!` marker in the type/scope portion
 * of a conventional commit message.
 *
 * @example
 * ```typescript
 * hasBreakingMarker("feat!: new feature"); // true
 * hasBreakingMarker("feat(api)!: change"); // true
 * hasBreakingMarker("feat: normal change"); // false
 * ```
 */
export function hasBreakingMarker(message: string): boolean {
	return BREAKING_INDICATORS.conventionalMarker.test(message);
}

/**
 * Extracts breaking change description from conventional commit body
 *
 * Looks for `BREAKING CHANGE:` or `BREAKING-CHANGE:` footer and
 * returns the description that follows.
 *
 * @returns The breaking change description, or null if not found
 *
 * @example
 * ```typescript
 * const body = "Some text\n\nBREAKING CHANGE: The API now requires auth";
 * extractBreakingDescription(body);
 * // Returns: "The API now requires auth"
 * ```
 */
export function extractBreakingDescription(body: string): string | null {
	const match = body.match(/^BREAKING[- ]CHANGE:\s*(.+)$/im);
	return match?.[1]?.trim() ?? null;
}

/**
 * Determines if a changeset section type indicates a breaking change
 *
 * In Changesets, "major" changes are breaking by definition.
 *
 * @example
 * ```typescript
 * isMajorSection("major"); // true
 * isMajorSection("minor"); // false
 * isMajorSection("patch"); // false
 * ```
 */
export function isMajorSection(sectionType: string): boolean {
	return sectionType.toLowerCase() === "major";
}
