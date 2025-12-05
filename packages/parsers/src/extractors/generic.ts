/**
 * Generic Format Extractor
 *
 * Extracts items from unstructured release text.
 * Used as a fallback when no specific format is detected.
 */

import type { ExtractedItem, ExtractedRelease } from "@whatsnew/types";
import {
	isContributorAcknowledgment,
	isContributorSection,
	validateChangelogItem,
} from "@whatsnew/utils";

/**
 * Extracts items from generic/unstructured release text.
 *
 * Looks for:
 * - Bullet points (-, *, •)
 * - Numbered lists
 * - Lines that look like change descriptions
 */
export function extractGeneric(body: string): ExtractedRelease {
	// Normalize line endings (Windows \r\n -> Unix \n)
	const normalizedBody = body.replace(/\r\n/g, "\n");
	const items: ExtractedItem[] = [];
	const lines = normalizedBody.split("\n");

	let currentSection = "Changes";
	let inSkipSection = false;

	for (const line of lines) {
		const trimmed = line.trim();

		// Check for section headers (## or ### format)
		const headerMatch = trimmed.match(/^#{2,3}\s+(.+)$/);
		if (headerMatch) {
			currentSection = headerMatch[1];
			// Skip contributor acknowledgment sections
			inSkipSection = isContributorSection(currentSection);
			continue;
		}

		// Skip items in contributor sections
		if (inSkipSection) continue;

		// Skip empty lines
		if (!trimmed) continue;

		// Match bullet points: -, *, •
		const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/);
		if (bulletMatch) {
			const text = bulletMatch[1].trim();
			const item = createValidatedItem(text, currentSection);
			if (item) items.push(item);
			continue;
		}

		// Match numbered lists: 1. or 1)
		const numberedMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
		if (numberedMatch) {
			const text = numberedMatch[1].trim();
			const item = createValidatedItem(text, currentSection);
			if (item) items.push(item);
		}
	}

	return {
		items,
		metadata: {
			format: "generic",
			formatConfidence: 0.3,
			summary: extractSummary(body),
		},
	};
}

/**
 * Creates a validated ExtractedItem from text and section.
 * Returns null if the item doesn't pass validation.
 */
function createValidatedItem(
	text: string,
	section: string,
): ExtractedItem | null {
	// Skip contributor acknowledgments
	if (isContributorAcknowledgment(text)) {
		return null;
	}

	// Validate item quality
	const validation = validateChangelogItem(text);
	if (!validation.valid) {
		return null;
	}

	return {
		text,
		refs: extractRefs(text),
		sourceHint: {
			section,
			suggestedCategory: "other",
		},
		score: validation.score,
	};
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
 * Extracts summary from the release body
 */
function extractSummary(body: string): string | undefined {
	const lines = body.split("\n");
	for (const line of lines) {
		const trimmed = line.trim();
		// Skip headers, empty lines, and bullet points
		if (trimmed && !trimmed.startsWith("#") && !trimmed.match(/^[-*•\d]/)) {
			return trimmed;
		}
	}
	return undefined;
}
