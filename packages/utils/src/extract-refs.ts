/**
 * Reference extraction utilities for GitHub and GitLab
 *
 * These functions extract issue/PR/MR numbers from changelog text.
 */

/**
 * Extracts GitHub-style PR/issue references from text
 *
 * Matches:
 * - `#123` - hash reference
 * - `[#123](url)` - markdown link with hash
 * - `GH-123` - GitHub prefix style
 *
 * @example
 * ```typescript
 * extractGitHubRefs("Fixed bug #123 and #456");
 * // Returns: ["123", "456"]
 * ```
 */
export function extractGitHubRefs(text: string): string[] {
	const refs = new Set<string>();

	// Match #123 format (but not ##123 which is a markdown header)
	const hashRefs = text.match(/(?<!#)#(\d+)/g);
	if (hashRefs) {
		for (const ref of hashRefs) {
			refs.add(ref.slice(1));
		}
	}

	// Match [#123](url) markdown link format
	const linkRefs = text.match(/\[#(\d+)\]/g);
	if (linkRefs) {
		for (const ref of linkRefs) {
			const num = ref.match(/\d+/)?.[0];
			if (num) {
				refs.add(num);
			}
		}
	}

	// Match GH-123 format
	const ghRefs = text.match(/GH-(\d+)/gi);
	if (ghRefs) {
		for (const ref of ghRefs) {
			const num = ref.match(/\d+/)?.[0];
			if (num) {
				refs.add(num);
			}
		}
	}

	return [...refs];
}

/**
 * GitLab reference pattern for MRs and issues
 *
 * Matches:
 * - `!123` - merge request
 * - `#123` - issue
 * - `[issue 123]` - issue reference in brackets
 * - `[!123]` - MR reference in brackets
 */
const GITLAB_REF_PATTERN =
	/\[issue\s+(\d+)\]|\[!(\d+)\]|(?<![/\w])!(\d+)(?!\d)|(?<![/\w])#(\d+)(?!\d)/gi;

/**
 * Extracts GitLab-style MR/issue references from text
 *
 * @example
 * ```typescript
 * extractGitLabRefs("Fixed in !123, see issue #456");
 * // Returns: ["123", "456"]
 * ```
 */
export function extractGitLabRefs(text: string): string[] {
	const refs: string[] = [];

	for (const match of text.matchAll(GITLAB_REF_PATTERN)) {
		// Match groups: [issue N], [!N], !N, #N
		const ref = match[1] || match[2] || match[3] || match[4];
		if (ref && !refs.includes(ref)) {
			refs.push(ref);
		}
	}

	return refs;
}

/**
 * Extracts references from text, auto-detecting platform
 *
 * Uses GitHub-style extraction by default, which works for most cases.
 * For GitLab-specific patterns (like !MR), use extractGitLabRefs directly.
 *
 * @example
 * ```typescript
 * extractRefs("Fixed #123 and #456");
 * // Returns: ["123", "456"]
 * ```
 */
export function extractRefs(text: string): string[] {
	// Default to GitHub-style as it's most common
	return extractGitHubRefs(text);
}

/**
 * Strips PR/issue reference links from text
 *
 * Removes:
 * - Inline markdown ref links `[#123](url)` anywhere in text
 * - Malformed double-bracket links `[[#123](url)`
 * - Trailing patterns like "(#123)", "(#123, #456)", "([#123](url))"
 * - Cleanup of empty parentheses and connectors after stripping
 *
 * This is used to clean text when refs are extracted to a separate field.
 *
 * @example
 * ```typescript
 * stripTrailingRefs("Add OAuth support (#123)");
 * // Returns: "Add OAuth support"
 *
 * stripTrailingRefs("Fixed ([#10135](url) and [#10115](url))");
 * // Returns: "Fixed"
 *
 * stripTrailingRefs("See [docs](url) for details");
 * // Returns: "See [docs](url) for details" (non-ref links preserved)
 * ```
 */
export function stripTrailingRefs(text: string): string {
	let result = text;
	let previousResult = "";

	// Loop until no more changes
	while (result !== previousResult) {
		previousResult = result;
		result = result
			// Strip malformed double-bracket links [[#123](url) FIRST (before single-bracket)
			.replace(/\[\[#\d+\]\([^)]+\)/g, "")
			// Strip inline markdown ref links [#123](url) anywhere
			.replace(/\[#\d+\]\([^)]+\)/g, "")
			// Match trailing markdown link: ([#123](url)) or [#123](url)
			.replace(/\s*\(\[#\d+\]\([^)]+\)\)\s*$/, "")
			.replace(/\s*\[#\d+\]\([^)]+\)\s*$/, "")
			// Match trailing patterns like (#123) or (#123, #456) or (fixes #123)
			.replace(
				/\s*\((?:closes?|fixes?|resolves?)?\s*#\d+(?:\s*,\s*#\d+)*\)\s*$/i,
				"",
			)
			// Clean up parenthetical connectors that are now empty: (and ) or ( and ) or (, )
			.replace(/\s*\(\s*(?:and|,|\s)+\s*\)\s*/g, "")
			// Clean up empty parentheses
			.replace(/\s*\(\s*\)\s*/g, "")
			.trim();
	}

	// Clean up multiple spaces
	return result.replace(/\s+/g, " ").trim();
}
