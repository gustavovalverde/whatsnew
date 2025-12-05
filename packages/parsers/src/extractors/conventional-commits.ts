/**
 * Conventional Commits Text Extractor
 *
 * Extracts items from release body text containing conventional commit-style entries.
 * Categorization is done by the universal categorizer.
 *
 * @see https://www.conventionalcommits.org/en/v1.0.0/
 */

import type {
	CategoryId,
	ExtractedItem,
	ExtractedRelease,
} from "@whatsnew/types";

/**
 * Extracts items from conventional commit-style release text.
 *
 * Format examples:
 * feat(api): add new authentication endpoint
 * fix(parser): resolve edge case in date parsing
 * docs: update README with examples
 * feat!: breaking change to API
 * BREAKING CHANGE: removed deprecated methods
 */
export function extractConventionalCommits(body: string): ExtractedRelease {
	// Normalize line endings (Windows \r\n -> Unix \n)
	const normalizedBody = body.replace(/\r\n/g, "\n");
	const items: ExtractedItem[] = [];
	const lines = normalizedBody.split("\n");

	// Track BREAKING CHANGE footer format
	let inBreakingSection = false;
	let breakingDescription = "";

	for (const line of lines) {
		const trimmed = line.trim();

		// Check for BREAKING CHANGE or BREAKING-CHANGE footer
		const breakingFooterMatch = trimmed.match(/^BREAKING[- ]CHANGE:\s*(.+)$/i);
		if (breakingFooterMatch) {
			inBreakingSection = true;
			breakingDescription = breakingFooterMatch[1];
			continue;
		}

		// Continue collecting breaking change description (multi-line)
		if (inBreakingSection) {
			if (trimmed === "" || trimmed.match(/^[a-z]+(\([^)]+\))?(!)?:/i)) {
				// End of breaking section, save it
				if (breakingDescription) {
					items.push({
						text: breakingDescription.trim(),
						refs: [],
						conventionalType: "breaking",
						breaking: true,
						sourceHint: {
							section: "BREAKING CHANGE",
							suggestedCategory: "breaking",
						},
					});
				}
				inBreakingSection = false;
				breakingDescription = "";
			} else {
				breakingDescription += ` ${trimmed}`;
				continue;
			}
		}

		// Try to parse as conventional commit
		const entry = parseConventionalCommitLine(line);
		if (entry) {
			items.push(entry);
		}
	}

	// Don't forget trailing breaking section
	if (inBreakingSection && breakingDescription) {
		items.push({
			text: breakingDescription.trim(),
			refs: [],
			conventionalType: "breaking",
			breaking: true,
			sourceHint: {
				section: "BREAKING CHANGE",
				suggestedCategory: "breaking",
			},
		});
	}

	return {
		items,
		metadata: {
			format: "conventional-commits",
			formatConfidence: 0.7,
			summary: extractSummary(body),
		},
	};
}

/**
 * Extracts summary from the release body
 */
function extractSummary(body: string): string | undefined {
	const lines = body.split("\n");
	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed && !trimmed.match(/^[a-z]+(\([^)]+\))?(!)?:/i)) {
			return trimmed;
		}
	}
	return undefined;
}

/**
 * Parses a single line as a conventional commit entry
 */
function parseConventionalCommitLine(line: string): ExtractedItem | null {
	const trimmed = line.trim();

	// Skip empty lines
	if (!trimmed) return null;

	// Pattern: type(scope)!: subject
	const ccRegex =
		/^(feat|fix|docs|style|refactor|perf|test|build|ci|chore)(?:\(([^)]+)\))?(!)?:\s*(.+)$/i;

	const match = trimmed.match(ccRegex);
	if (!match) return null;

	const [, type, scope, breakingMarker, rawSubject] = match;

	// Check for BREAKING CHANGE or BREAKING-CHANGE in subject
	const hasBreakingInSubject =
		/^BREAKING[- ]CHANGE:/i.test(rawSubject) ||
		rawSubject.toUpperCase().includes("BREAKING");

	const breaking = breakingMarker === "!" || hasBreakingInSubject;

	// Clean up subject - remove trailing PR reference like (#123)
	const subject = rawSubject.replace(/\s*\(#\d+\)\s*$/, "").trim();

	// Extract PR/issue references
	const refs: string[] = [];
	const refRegex = /#(\d+)/g;
	for (const refMatch of trimmed.matchAll(refRegex)) {
		const [, ref] = refMatch;
		if (ref) {
			refs.push(ref);
		}
	}

	const conventionalType = type.toLowerCase();

	return {
		text: subject,
		refs,
		conventionalType,
		scope: scope || undefined,
		breaking,
		sourceHint: {
			section: conventionalType,
			suggestedCategory: mapTypeToSuggestedCategory(conventionalType, breaking),
		},
	};
}

/**
 * Maps conventional commit type to suggested category
 */
function mapTypeToSuggestedCategory(
	type: string,
	breaking: boolean,
): CategoryId {
	if (breaking) return "breaking";

	const map: Record<string, CategoryId> = {
		feat: "features",
		fix: "fixes",
		docs: "docs",
		style: "other",
		refactor: "refactor",
		perf: "perf",
		test: "other",
		build: "chore",
		ci: "chore",
		chore: "chore",
	};

	return map[type] || "other";
}
