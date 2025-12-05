/**
 * Anchor Extractor - Deterministic extraction of source references
 *
 * Extracts PR refs, issue refs, commit SHAs, and URLs from raw content
 * before AI processing. This enables grounded generation by providing
 * AI with the list of valid anchors to reference.
 */

export interface Anchors {
	/** PR numbers extracted (without #) */
	prRefs: string[];
	/** Issue numbers (if distinguishable from PRs) */
	issueRefs: string[];
	/** Commit SHA references */
	commitShas: string[];
	/** Full GitHub URLs found */
	urls: string[];
}

/**
 * Extract all anchors (references) from raw changelog content
 *
 * @param rawContent - Raw release notes/changelog content
 * @returns Anchors object with deduplicated references
 */
export function extractAnchors(rawContent: string): Anchors {
	// Extract PR/Issue refs (format: #123 or #1234)
	// We can't distinguish PRs from issues purely from text
	const refMatches = [...rawContent.matchAll(/#(\d+)/g)];
	const allRefs = [...new Set(refMatches.map((m) => m[1]))];

	// Extract GitHub URLs
	const urlMatches = [
		...rawContent.matchAll(/https?:\/\/github\.com\/[^\s)\]>]+/g),
	];
	const urls = [...new Set(urlMatches.map((m) => m[0]))];

	// Extract commit SHAs (7-40 hex characters, typically in commit contexts)
	// Look for patterns like: commit abc1234, (abc1234), or standalone SHA-like strings
	const shaMatches = [...rawContent.matchAll(/\b([a-f0-9]{7,40})\b/gi)].filter(
		(m) => {
			// Filter out likely false positives (needs at least one letter and one number)
			const sha = m[1];
			return /[a-f]/i.test(sha) && /[0-9]/.test(sha);
		},
	);
	const commitShas = [...new Set(shaMatches.map((m) => m[1]))];

	// Extract refs from GitHub URLs (e.g., /pull/123, /issues/456)
	const urlRefMatches = [
		...rawContent.matchAll(
			/github\.com\/[^/]+\/[^/]+\/(?:pull|issues)\/(\d+)/g,
		),
	];
	const urlRefs = urlRefMatches.map((m) => m[1]);

	// Combine all refs (from # notation and URLs)
	const combinedRefs = [...new Set([...allRefs, ...urlRefs])];

	return {
		prRefs: combinedRefs, // Can't distinguish PRs from issues
		issueRefs: [], // Would need API call to distinguish
		commitShas,
		urls,
	};
}

/**
 * Format anchors for inclusion in AI prompt
 *
 * @param anchors - Extracted anchors
 * @returns Formatted string for prompt injection
 */
export function formatAnchorsForPrompt(anchors: Anchors): string {
	const parts: string[] = [];

	if (anchors.prRefs.length > 0) {
		parts.push(
			`- PR/Issue refs: ${anchors.prRefs.map((r) => `#${r}`).join(", ")}`,
		);
	} else {
		parts.push("- PR/Issue refs: (none found)");
	}

	if (anchors.commitShas.length > 0) {
		// Only show first 5 to avoid prompt bloat
		const displayShas = anchors.commitShas.slice(0, 5);
		const suffix =
			anchors.commitShas.length > 5
				? ` (+${anchors.commitShas.length - 5} more)`
				: "";
		parts.push(`- Commit SHAs: ${displayShas.join(", ")}${suffix}`);
	}

	return parts.join("\n");
}
