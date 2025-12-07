/**
 * GitHub Auto-Generated Release Notes Extractor
 *
 * Extracts items from GitHub's automatically generated release notes format.
 * Categorization is done by the universal categorizer.
 *
 * @see https://docs.github.com/en/repositories/releasing-projects-on-github/automatically-generated-release-notes
 */

import type {
	CategoryId,
	ExtractedItem,
	ExtractedRelease,
} from "@whatsnew/types";
import { stripTrailingRefs } from "@whatsnew/utils";

/**
 * Maps GitHub auto-generated category titles to suggested categories
 */
const GITHUB_CATEGORY_MAP: Record<string, CategoryId> = {
	features: "features",
	"new features": "features",
	"exciting new features": "features",
	enhancements: "features",
	enhancement: "features",
	"bug fixes": "fixes",
	"bug fix": "fixes",
	bugfixes: "fixes",
	fixes: "fixes",
	fixed: "fixes",
	"breaking changes": "breaking",
	breaking: "breaking",
	security: "security",
	"security fixes": "security",
	documentation: "docs",
	docs: "docs",
	dependencies: "deps",
	"dependency updates": "deps",
	performance: "perf",
	"performance improvements": "perf",
	refactoring: "refactor",
	refactor: "refactor",
	chore: "chore",
	chores: "chore",
	maintenance: "chore",
	other: "other",
	"other changes": "other",
	changes: "other",
};

/**
 * Extracts items from GitHub auto-generated release notes.
 *
 * Format example:
 * ## What's Changed
 * ### Features
 * * Add new API endpoint by @contributor in https://github.com/owner/repo/pull/123
 *
 * ## New Contributors
 * * @newuser made their first contribution in https://github.com/owner/repo/pull/125
 *
 * **Full Changelog:** https://github.com/owner/repo/compare/v1.0.0...v2.0.0
 */
export function extractGitHubAuto(body: string): ExtractedRelease {
	// Normalize line endings (Windows \r\n -> Unix \n)
	const normalizedBody = body.replace(/\r\n/g, "\n");
	const items: ExtractedItem[] = [];

	// Split body into sections
	const sections = normalizedBody.split(/^##\s+/m).filter((s) => s.trim());

	for (const section of sections) {
		const lines = section.split("\n");
		const headerLine = lines[0].trim();

		// Skip "New Contributors" section - not change items
		if (headerLine.toLowerCase().startsWith("new contributors")) {
			continue;
		}

		// Handle "What's Changed" section
		if (headerLine.toLowerCase().startsWith("what's changed")) {
			const content = lines.slice(1).join("\n");

			// Check for subsections (### headers)
			if (content.includes("### ")) {
				const subsections = content.split(/^###\s+/m).filter((s) => s.trim());
				for (const subsection of subsections) {
					const subLines = subsection.split("\n");
					const subHeader = subLines[0].trim();
					if (subHeader) {
						const sectionItems = parseEntries(subLines.slice(1), subHeader);
						items.push(...sectionItems);
					}
				}
			} else {
				// No subsections, all entries under "What's Changed"
				const sectionItems = parseEntries(lines.slice(1), "Changes");
				items.push(...sectionItems);
			}
			continue;
		}

		// Handle other top-level sections (when not using "What's Changed")
		if (!headerLine.toLowerCase().includes("changelog")) {
			const sectionItems = parseEntries(lines.slice(1), headerLine);
			items.push(...sectionItems);
		}
	}

	return {
		items,
		metadata: {
			format: "github-auto-generated",
			formatConfidence: 0.5,
			summary: extractSummary(body),
		},
	};
}

/**
 * Extracts summary from the release body
 */
function extractSummary(body: string): string | undefined {
	// Look for description before "What's Changed"
	const match = body.match(/^(.+?)(?=##\s+What's Changed)/s);
	if (match) {
		const summary = match[1].trim();
		if (summary) {
			return summary.split("\n")[0];
		}
	}
	return undefined;
}

/**
 * Parse entry lines in GitHub auto-generated format
 * Format: * PR Title by @author in https://github.com/owner/repo/pull/123
 */
function parseEntries(lines: string[], sectionTitle: string): ExtractedItem[] {
	const items: ExtractedItem[] = [];

	// Normalize section title for category suggestion
	const normalizedTitle = sectionTitle
		.toLowerCase()
		.replace(/[\p{Emoji}]/gu, "")
		.trim();
	const suggestedCategory = GITHUB_CATEGORY_MAP[normalizedTitle] || "other";

	// Match: * Title by @author in URL
	const entryRegex =
		/^\*\s+(.+?)\s+by\s+@([\w-]+)\s+in\s+(https:\/\/github\.com\/[^\s]+\/pull\/(\d+))/;

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed.startsWith("*")) continue;

		const match = trimmed.match(entryRegex);
		if (match) {
			const [, rawTitle, author, prUrl, prNumber] = match;

			// Strip trailing refs from title to avoid duplication
			const title = stripTrailingRefs(rawTitle.trim());

			items.push({
				text: title,
				refs: [prNumber],
				sourceHint: {
					section: sectionTitle,
					suggestedCategory,
				},
				author,
				prUrl,
			});
		}
	}

	return items;
}
