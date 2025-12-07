/**
 * Keep-a-Changelog Format Extractor
 *
 * Extracts items from Keep-a-Changelog format without categorizing them.
 * Categorization is done by the universal categorizer.
 *
 * @see https://keepachangelog.com/en/1.1.0/
 */

import type {
	CategoryId,
	ExtractedItem,
	ExtractedRelease,
} from "@whatsnew/types";
import { stripTrailingRefs } from "@whatsnew/utils";

/**
 * Maps Keep-a-Changelog section names to suggested categories
 * Supports both standard Keep-a-Changelog and Conventional Commits section names
 */
const SECTION_TO_CATEGORY: Record<string, CategoryId> = {
	// Standard Keep-a-Changelog sections
	added: "features",
	changed: "other",
	deprecated: "other",
	removed: "breaking",
	fixed: "fixes",
	security: "security",
	// Conventional Commits style sections (used by vite, etc.)
	"bug fixes": "fixes",
	features: "features",
	"performance improvements": "perf",
	"miscellaneous chores": "chore",
	"code refactoring": "refactor",
	documentation: "docs",
	"breaking changes": "breaking",
	tests: "chore",
	build: "chore",
	ci: "chore",
	chore: "chore",
	refactor: "refactor",
	perf: "perf",
	style: "chore",
};

/**
 * Extracts items from Keep-a-Changelog format.
 *
 * Supports two formats:
 * 1. Full changelog with version headers: `## [1.0.0] - 2024-01-15`
 * 2. Release notes with only section headers: `### Added`, `### Fixed`, etc.
 *
 * @param markdown - The changelog content
 * @param targetVersion - Optional version to extract (if parsing full changelog)
 */
export function extractKeepAChangelog(
	markdown: string,
	targetVersion?: string,
): ExtractedRelease {
	// Normalize line endings (Windows \r\n -> Unix \n)
	const normalizedMarkdown = markdown.replace(/\r\n/g, "\n");

	const items: ExtractedItem[] = [];

	// Check if there are version headers
	const versionRegex = /^##\s+\[?([^\]]+)\]?\s*-?\s*(\d{4}-\d{2}-\d{2})?/gm;
	const hasVersionHeaders = versionRegex.test(normalizedMarkdown);
	versionRegex.lastIndex = 0;

	let contentToParse = normalizedMarkdown;
	let summary: string | undefined;

	if (hasVersionHeaders && targetVersion) {
		// Extract specific version section
		const versionContent = extractVersionSection(
			normalizedMarkdown,
			targetVersion,
		);
		if (versionContent) {
			contentToParse = versionContent;
		}
	} else if (hasVersionHeaders) {
		// Extract first (latest) version
		const firstVersionContent = extractFirstVersionSection(normalizedMarkdown);
		if (firstVersionContent) {
			contentToParse = firstVersionContent.content;
			summary = `Version ${firstVersionContent.version}`;
		}
	}

	// Parse sections and extract items
	// Match any ### section header (supports both Keep-a-Changelog and Conventional Commits styles)
	const sectionRegex = /###\s+([^\n]+)\s*([\s\S]*?)(?=###|##|$)/gi;

	for (const match of contentToParse.matchAll(sectionRegex)) {
		const [, heading, body] = match;
		const sectionName = heading.toLowerCase().trim();
		const suggestedCategory = SECTION_TO_CATEGORY[sectionName] || "other";

		// Extract items from section
		const sectionItems = extractSectionItems(body, heading, suggestedCategory);
		items.push(...sectionItems);
	}

	return {
		items,
		metadata: {
			format: "keep-a-changelog",
			formatConfidence: 0.9,
			summary,
		},
	};
}

/**
 * Extracts items from a section body
 */
function extractSectionItems(
	body: string,
	sectionName: string,
	suggestedCategory: CategoryId,
): ExtractedItem[] {
	const items: ExtractedItem[] = [];
	const lines = body.split("\n");

	for (const line of lines) {
		// Match bullet points (- or *)
		const bulletMatch = line.match(/^[-*]\s+(.+)$/);
		if (!bulletMatch) continue;

		const rawText = bulletMatch[1].trim();
		if (!rawText) continue;

		// Extract refs from the text (PR numbers, issue numbers)
		const refs = extractRefs(rawText);

		// Strip trailing refs from text to avoid duplication in output
		const text = stripTrailingRefs(rawText);

		items.push({
			text,
			refs,
			sourceHint: {
				section: sectionName,
				suggestedCategory,
			},
		});
	}

	return items;
}

/**
 * Extracts PR/issue references from text
 */
function extractRefs(text: string): string[] {
	const refs: string[] = [];

	// Match #123 format
	const hashRefs = text.match(/#(\d+)/g);
	if (hashRefs) {
		refs.push(...hashRefs.map((r) => r.slice(1)));
	}

	// Match [#123](url) markdown link format
	const linkRefs = text.match(/\[#(\d+)\]/g);
	if (linkRefs) {
		for (const ref of linkRefs) {
			const num = ref.match(/\d+/)?.[0];
			if (num && !refs.includes(num)) {
				refs.push(num);
			}
		}
	}

	return refs;
}

/**
 * Extracts content for a specific version
 */
function extractVersionSection(
	markdown: string,
	version: string,
): string | null {
	const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const regex = new RegExp(
		`##\\s+\\[?${escapedVersion}\\]?[^\\n]*\\n([\\s\\S]*?)(?=##\\s+\\[|$)`,
		"i",
	);
	const match = markdown.match(regex);
	return match ? match[1] : null;
}

/**
 * Extracts the first (latest) version section
 */
function extractFirstVersionSection(
	markdown: string,
): { version: string; content: string } | null {
	const regex = /##\s+\[?([^\]\n]+)\]?[^\n]*\n([\s\S]*?)(?=##\s+\[|$)/;
	const match = markdown.match(regex);
	if (match) {
		return {
			version: match[1].trim(),
			content: match[2],
		};
	}
	return null;
}
