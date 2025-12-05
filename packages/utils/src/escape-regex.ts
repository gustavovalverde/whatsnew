/**
 * Escapes special regex characters in a string
 *
 * Use this when you need to match a literal string in a regex pattern.
 *
 * @example
 * ```typescript
 * const userInput = "hello (world)";
 * const pattern = new RegExp(escapeRegex(userInput));
 * // pattern matches "hello (world)" literally
 * ```
 */
export function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
