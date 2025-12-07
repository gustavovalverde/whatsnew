/**
 * Changesets Format Extractor
 *
 * Extracts items from Changesets format without categorizing them.
 * Categorization is done by the universal categorizer.
 *
 * @see https://github.com/changesets/changesets
 */

import type {
	CategoryId,
	ExtractedItem,
	ExtractedRelease,
} from "@whatsnew/types";

/**
 * Section hint mapping for source metadata
 */
const SECTION_HINTS: Record<
	string,
	{ section: string; suggestedCategory: CategoryId }
> = {
	major: { section: "Major Changes", suggestedCategory: "breaking" },
	minor: { section: "Minor Changes", suggestedCategory: "features" },
	patch: { section: "Patch Changes", suggestedCategory: "fixes" },
};

/**
 * Extracts items from Changesets format.
 *
 * Official format example:
 * ### Major Changes
 * - [abc1234] **(pkg-a, pkg-c)** Breaking change description
 *
 * ### Minor Changes
 * - [def5678] **(pkg-b)** New feature description
 *
 * ### Patch Changes
 * - [ghi9012] **(pkg-a)** Bug fix description
 */
export function extractChangesets(body: string): ExtractedRelease {
	// Normalize line endings (Windows \r\n -> Unix \n)
	const normalizedBody = body.replace(/\r\n/g, "\n");

	const items: ExtractedItem[] = [];

	// Extract from each section type
	items.push(...extractSection(normalizedBody, "Major Changes", "major"));
	items.push(...extractSection(normalizedBody, "Minor Changes", "minor"));
	items.push(...extractSection(normalizedBody, "Patch Changes", "patch"));

	// Extract Updated dependencies section
	items.push(...extractDependenciesSection(normalizedBody));

	return {
		items,
		metadata: {
			format: "changesets",
			formatConfidence: 0.85,
			summary: extractSummary(normalizedBody),
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
		if (trimmed && !trimmed.startsWith("#")) {
			return trimmed;
		}
	}
	return undefined;
}

/**
 * Extracts items from a specific section
 */
function extractSection(
	body: string,
	heading: string,
	sectionType: "major" | "minor" | "patch",
): ExtractedItem[] {
	const regex = new RegExp(
		`###\\s*${escapeRegex(heading)}\\s*([\\s\\S]*?)(?=###|$)`,
		"i",
	);
	const match = body.match(regex);

	if (!match) return [];

	const content = match[1];
	const items: ExtractedItem[] = [];
	const lines = content.split("\n");

	let currentItem: Partial<ExtractedItem> | null = null;

	for (const line of lines) {
		// Extract inline "Updated dependencies" as deps items
		const depMatch = line.match(/^-\s+Updated dependencies\s*\[([a-z0-9]+)\]/i);
		if (depMatch) {
			if (currentItem) {
				items.push(finalizeItem(currentItem, sectionType));
				currentItem = null;
			}
			const [, hash] = depMatch;
			items.push({
				text: "Updated dependencies",
				refs: [hash],
				sourceHint: {
					section: "Updated dependencies",
					suggestedCategory: "deps",
				},
			});
			continue;
		}

		// Skip "Updated dependencies" without hash (continuation lines are handled below)
		if (line.match(/^-\s+Updated dependencies\s*$/)) {
			if (currentItem) {
				items.push(finalizeItem(currentItem, sectionType));
				currentItem = null;
			}
			continue;
		}

		// Extended changesets format (used by shadcn, etc.):
		// -   [#PR](url) [`commit`](url) Thanks [@author](url)! - message
		const extendedMatch = line.match(
			/^-\s+\[#(\d+)\]\([^)]+\)\s*\[`([a-f0-9]+)`\]\([^)]+\)\s*Thanks\s*\[@[^\]]+\]\([^)]+\)!\s*-\s*(.+)$/i,
		);

		if (extendedMatch) {
			if (currentItem) {
				items.push(finalizeItem(currentItem, sectionType));
			}

			const [, prNumber, hash, message] = extendedMatch;
			const parsed = parseMessage(message);

			currentItem = {
				text: parsed.text,
				refs: [`#${prNumber}`, hash.slice(0, 7)],
				conventionalType: parsed.type,
				scope: parsed.scope,
				breaking: parsed.breaking || sectionType === "major",
			};
			continue;
		}

		// Official Changesets format: - [hash] **(packages)** Description
		const officialMatch = line.match(
			/^-\s+\[([a-z0-9]+)\]\s*(?:\*\*\(([^)]+)\)\*\*)?\s*(.+)$/i,
		);

		if (officialMatch) {
			if (currentItem) {
				items.push(finalizeItem(currentItem, sectionType));
			}

			const [, hash, packages, message] = officialMatch;
			const parsed = parseMessage(message);

			currentItem = {
				text: parsed.text,
				refs: [hash],
				conventionalType: parsed.type,
				scope: parsed.scope || packages?.trim(),
				breaking: parsed.breaking || sectionType === "major",
			};
			continue;
		}

		// Alternative format: -   <hash>: <message>
		const bulletMatch = line.match(/^-\s+([a-z0-9]+):\s+(.+)$/i);

		if (bulletMatch) {
			if (currentItem) {
				items.push(finalizeItem(currentItem, sectionType));
			}

			const [, hash, message] = bulletMatch;
			const parsed = parseMessage(message);

			currentItem = {
				text: parsed.text,
				refs: [hash],
				conventionalType: parsed.type,
				scope: parsed.scope,
				breaking: parsed.breaking || sectionType === "major",
			};
		} else if (currentItem && line.trim()) {
			// Skip package version lines
			const isPackageLine = line.match(/^\s+-\s+[@\w][\w\-/]*@[\d.]+/);
			if (!isPackageLine) {
				// Continuation line
				currentItem.text += ` ${line.trim()}`;
			}
		}
	}

	if (currentItem) {
		items.push(finalizeItem(currentItem, sectionType));
	}

	return items;
}

/**
 * Finalizes a partial item into a complete ExtractedItem
 */
function finalizeItem(
	partial: Partial<ExtractedItem>,
	sectionType: "major" | "minor" | "patch",
): ExtractedItem {
	const hint = SECTION_HINTS[sectionType];

	return {
		text: partial.text || "",
		refs: partial.refs || [],
		sourceHint: {
			section: hint.section,
			suggestedCategory: hint.suggestedCategory,
		},
		conventionalType: partial.conventionalType,
		scope: partial.scope,
		breaking: partial.breaking,
	};
}

/**
 * Extracts Updated dependencies section
 */
function extractDependenciesSection(body: string): ExtractedItem[] {
	const regex = /###\s*Updated dependencies\s*([\s\S]*?)(?=###|$)/i;
	const match = body.match(regex);

	if (!match) return [];

	const content = match[1];
	const items: ExtractedItem[] = [];
	const lines = content.split("\n");

	for (const line of lines) {
		const depMatch = line.match(/^-\s+Updated dependencies\s+\[([a-z0-9]+)\]/i);

		if (depMatch) {
			const [, hash] = depMatch;
			items.push({
				text: "Updated dependencies",
				refs: [hash],
				sourceHint: {
					section: "Updated dependencies",
					suggestedCategory: "deps",
				},
			});
		}
	}

	return items;
}

/**
 * Parses a change message to extract type, scope, breaking indicators
 */
function parseMessage(message: string): {
	text: string;
	type?: string;
	scope?: string;
	breaking: boolean;
} {
	let text = message;
	let type: string | undefined;
	let scope: string | undefined;
	let breaking = false;

	// Pattern 1: type(scope)!: message
	const conventionalBreakingMatch = text.match(
		/^(\w+)\s*\(([^)]+)\)!:\s*(.+)$/,
	);
	if (conventionalBreakingMatch) {
		const [, typeMatch, scopeMatch, messageText] = conventionalBreakingMatch;
		type = typeMatch.toLowerCase();
		scope = scopeMatch.trim();
		text = messageText;
		breaking = true;
		return { text, type, scope, breaking };
	}

	// Pattern 2: type(scope): message
	const conventionalMatch = text.match(/^(\w+)\s*\(([^)]+)\):\s*(.+)$/);
	if (conventionalMatch) {
		const [, typeMatch, scopeMatch, messageText] = conventionalMatch;
		type = typeMatch.toLowerCase();
		scope = scopeMatch.trim();
		text = messageText;
		return { text, type, scope, breaking };
	}

	// Pattern 3: BREAKING: message or BREAKING CHANGE: message
	const breakingOnlyMatch = text.match(
		/^(BREAKING(?:\s+CHANGE)?|Breaking):\s*(.+)$/,
	);
	if (breakingOnlyMatch) {
		type = "breaking";
		breaking = true;
		text = breakingOnlyMatch[2];
		return { text, type, scope, breaking };
	}

	// Pattern 4: type!: message (no scope)
	const simpleBreakingMatch = text.match(/^(\w+)!:\s*(.+)$/);
	if (simpleBreakingMatch) {
		const [, typeMatch, messageText] = simpleBreakingMatch;
		type = typeMatch.toLowerCase();
		text = messageText;
		breaking = true;
		return { text, type, scope, breaking };
	}

	// Pattern 5: type: message (no scope, no breaking)
	const simpleMatch = text.match(/^(\w+):\s*(.+)$/);
	if (simpleMatch) {
		const [, typeMatch, messageText] = simpleMatch;
		type = typeMatch.toLowerCase();
		text = messageText;
		return { text, type, scope, breaking };
	}

	return { text, type, scope, breaking };
}

/**
 * Escapes special regex characters
 */
function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
