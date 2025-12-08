/**
 * Text normalization utilities
 *
 * These functions normalize text for consistent processing across platforms.
 */

/**
 * Normalizes line endings to Unix-style (LF)
 *
 * Converts Windows-style CRLF (\r\n) to Unix-style LF (\n).
 * This ensures consistent text processing regardless of source platform.
 *
 * @example
 * ```typescript
 * normalizeLineEndings("line1\r\nline2\r\n");
 * // Returns: "line1\nline2\n"
 * ```
 */
export function normalizeLineEndings(text: string): string {
	return text.replace(/\r\n/g, "\n");
}

/**
 * Normalizes whitespace in text
 *
 * - Collapses multiple spaces to single space
 * - Trims leading/trailing whitespace
 *
 * @example
 * ```typescript
 * normalizeWhitespace("  hello   world  ");
 * // Returns: "hello world"
 * ```
 */
export function normalizeWhitespace(text: string): string {
	return text.replace(/\s+/g, " ").trim();
}

/**
 * Normalizes text for comparison/deduplication
 *
 * - Converts to lowercase
 * - Normalizes whitespace
 * - Removes punctuation
 * - Takes first N characters for fuzzy matching
 *
 * @param text - Text to normalize
 * @param maxLength - Maximum length to compare (default: 50)
 *
 * @example
 * ```typescript
 * normalizeForComparison("Fix: Bug in auth!");
 * // Returns: "fix bug in auth"
 * ```
 */
export function normalizeForComparison(text: string, maxLength = 50): string {
	return text
		.toLowerCase()
		.replace(/[^\w\s]/g, "")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, maxLength);
}

/**
 * Normalizes changelog item text for deduplication
 *
 * Specialized normalization for changelog entries that:
 * - Removes leading PR/issue prefixes like `#1234 - ` or `#1234: `
 * - Removes markdown bold scope prefixes like `**scope**:`
 * - Removes trailing PR/issue references like `(#123)`
 * - Removes author attributions like `, by @username` or `by @username`
 * - Removes markdown links `[text](url)`
 * - Converts to lowercase and normalizes whitespace
 * - Truncates to first 100 chars for comparison
 *
 * @param text - Changelog item text to normalize
 *
 * @example
 * ```typescript
 * normalizeForDeduplication("**auth**: Add OAuth support (#1234)");
 * // Returns: "add oauth support"
 *
 * normalizeForDeduplication("#1242 - fix Inertia adapter, by @gustavovalverde");
 * // Returns: "fix inertia adapter"
 *
 * normalizeForDeduplication("See [docs](https://example.com) for more");
 * // Returns: "see for more"
 * ```
 */
export function normalizeForDeduplication(text: string): string {
	return text
		.toLowerCase()
		.replace(/^#\d+\s*[-:]\s*/, "") // Remove leading #1234 - or #1234:
		.replace(/^\*\*[^*]+\*\*:\s*/, "") // Remove **scope**: prefix
		.replace(/,?\s*by\s+@[\w-]+/gi, "") // Remove ", by @author" or "by @author"
		.replace(/\s*\((?:closes|fixes|resolves)?\s*#\d+\)\s*$/i, "") // Remove trailing (#123), (closes #123), etc.
		.replace(/\[[^\]]+\]\([^)]+\)/g, "") // Remove markdown links
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 100);
}
