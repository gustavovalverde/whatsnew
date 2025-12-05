/**
 * GitLab Official Release Notes Extractor
 *
 * Extracts items from GitLab's official release format used by gitlab-org/gitlab.
 * This format features:
 * - HTML `<details>/<summary>` collapsible sections for features
 * - Hierarchical headers: `####` for tiers, `#####` for categories
 * - `<code>` tags for feature labels
 * - Blockquoted descriptions inside details
 *
 * @see https://gitlab.com/gitlab-org/gitlab/-/releases
 * @see https://docs.gitlab.com/user/markdown/
 */

import type {
	CategoryId,
	ExtractedItem,
	ExtractedRelease,
} from "@whatsnew/types";

/**
 * Maps GitLab stage/category names to WNF category IDs
 */
const GITLAB_STAGE_MAP: Record<string, CategoryId> = {
	// Security stages
	security: "security",
	"security risk management": "security",
	"software supply chain security": "security",
	"vulnerability management": "security",
	compliance: "security",
	// Feature stages
	create: "features",
	plan: "features",
	verify: "features",
	package: "features",
	deploy: "features",
	release: "features",
	configure: "features",
	monitor: "features",
	govern: "features",
	// Documentation
	documentation: "docs",
	// Other
	enablement: "other",
	growth: "other",
};

/**
 * Regex patterns for parsing GitLab Official format
 */
const PATTERNS = {
	// Match <details><summary>...</summary>...</details> blocks
	details: /<details>\s*<summary>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/gi,
	// Match markdown link [text](url)
	link: /\[([^\]]+)\]\(([^)]+)\)/,
	// Match <code>content</code> tags
	codeTag: /<code>([^<]+)<\/code>/gi,
	// Match <i>content</i> tags (annotations like "SaaS only")
	italicTag: /<i>([^<]+)<\/i>/gi,
	// Match category headers: ##### [Category Name](url)
	categoryHeader: /^#####\s*\[([^\]]+)\]\(([^)]+)\)/gm,
	// Match tier headers: #### [Tier Name](url)
	tierHeader: /^####\s*\[([^\]]+)\]\(([^)]+)\)/gm,
	// Match GitLab issue/MR references
	gitlabRef:
		/\[issue\s+(\d+)\]|\[!(\d+)\]|(?<![/\w])!(\d+)(?!\d)|(?<![/\w])#(\d+)(?!\d)/gi,
	// Match shield.io badges (to skip)
	shieldBadge: /!\[[^\]]*\]\(https:\/\/img\.shields\.io[^)]+\)/g,
};

/**
 * Extracts items from GitLab Official release format.
 *
 * @param body - The release description body
 * @returns ExtractedRelease with items and metadata
 */
export function extractGitLabOfficial(body: string): ExtractedRelease {
	// Normalize line endings
	const normalizedBody = body.replace(/\r\n/g, "\n");

	const items: ExtractedItem[] = [];

	// Track current category context from headers
	let currentCategory: string | null = null;

	// Split body into sections by tier/category headers
	const sections = splitByHeaders(normalizedBody);

	for (const section of sections) {
		// Update category context from section header
		if (section.category) {
			currentCategory = section.category;
		}

		// Extract all <details> blocks from this section
		const detailsBlocks = extractDetailsBlocks(section.content);

		for (const block of detailsBlocks) {
			const item = parseFeatureBlock(block, currentCategory);
			if (item) {
				items.push(item);
			}
		}
	}

	// If no items found via details blocks, try to extract standalone features
	if (items.length === 0) {
		const standaloneItems = extractStandaloneFeatures(normalizedBody);
		items.push(...standaloneItems);
	}

	return {
		items,
		metadata: {
			format: "gitlab-official",
			formatConfidence: items.length > 0 ? 0.9 : 0.5,
			summary: extractSummary(normalizedBody),
		},
	};
}

/**
 * Section parsed from body with optional category context
 */
interface Section {
	category: string | null;
	tier: string | null;
	content: string;
}

/**
 * Splits the body into sections based on tier/category headers
 */
function splitByHeaders(body: string): Section[] {
	const sections: Section[] = [];
	const lines = body.split("\n");

	let currentSection: Section = {
		category: null,
		tier: null,
		content: "",
	};

	for (const line of lines) {
		// Check for tier header (####)
		const tierMatch = line.match(/^####\s*\[([^\]]+)\]/);
		if (tierMatch) {
			// Save previous section if it has content
			if (currentSection.content.trim()) {
				sections.push(currentSection);
			}
			currentSection = {
				category: null,
				tier: tierMatch[1].toLowerCase(),
				content: "",
			};
			continue;
		}

		// Check for category header (#####)
		const categoryMatch = line.match(/^#####\s*\[([^\]]+)\]/);
		if (categoryMatch) {
			// Save previous section if it has content
			if (currentSection.content.trim()) {
				sections.push(currentSection);
			}
			currentSection = {
				category: categoryMatch[1].toLowerCase(),
				tier: currentSection.tier,
				content: "",
			};
			continue;
		}

		// Add line to current section
		currentSection.content += `${line}\n`;
	}

	// Don't forget the last section
	if (currentSection.content.trim()) {
		sections.push(currentSection);
	}

	return sections;
}

/**
 * Details block extracted from content
 */
interface DetailsBlock {
	summary: string;
	content: string;
}

/**
 * Extracts all <details> blocks from content
 */
function extractDetailsBlocks(content: string): DetailsBlock[] {
	const blocks: DetailsBlock[] = [];

	for (const match of content.matchAll(PATTERNS.details)) {
		blocks.push({
			summary: match[1].trim(),
			content: match[2].trim(),
		});
	}

	return blocks;
}

/**
 * Parses a feature from a details block
 */
function parseFeatureBlock(
	block: DetailsBlock,
	currentCategory: string | null,
): ExtractedItem | null {
	const { summary, content } = block;

	// Extract feature title from markdown link in summary
	const linkMatch = summary.match(PATTERNS.link);
	if (!linkMatch) {
		// No link found, use full summary as text (cleaned)
		const cleanedSummary = cleanHtml(summary);
		if (!cleanedSummary) return null;

		return {
			text: cleanedSummary,
			refs: extractRefs(`${summary} ${content}`),
			sourceHint: {
				section: currentCategory || "features",
				suggestedCategory: mapCategoryToId(currentCategory),
			},
		};
	}

	const [, title, docsUrl] = linkMatch;

	// Extract code tags as feature labels
	const labels = extractCodeTags(summary);

	// Extract annotations like "(SaaS only)"
	const annotations = extractAnnotations(summary);

	// Extract refs from both summary and content
	const refs = extractRefs(`${summary} ${content}`);

	// Build the text - include labels if present
	let text = title.trim();
	if (labels.length > 0) {
		text += ` (${labels.join(", ")})`;
	}
	if (annotations.length > 0) {
		text += ` [${annotations.join(", ")}]`;
	}

	return {
		text,
		refs,
		sourceHint: {
			section: currentCategory || "features",
			suggestedCategory: mapCategoryToId(currentCategory),
		},
		prUrl: docsUrl,
	};
}

/**
 * Extracts <code> tag contents
 */
function extractCodeTags(text: string): string[] {
	const tags: string[] = [];

	for (const match of text.matchAll(PATTERNS.codeTag)) {
		tags.push(match[1].trim());
	}

	return tags;
}

/**
 * Extracts <i> tag annotations (like "SaaS only")
 */
function extractAnnotations(text: string): string[] {
	const annotations: string[] = [];

	for (const match of text.matchAll(PATTERNS.italicTag)) {
		const content = match[1].trim().replace(/[()]/g, "");
		if (content) {
			annotations.push(content);
		}
	}

	return annotations;
}

/**
 * Extracts GitLab issue/MR references
 */
function extractRefs(text: string): string[] {
	const refs: string[] = [];

	for (const match of text.matchAll(PATTERNS.gitlabRef)) {
		// Match groups: [issue N], [!N], !N, #N
		const ref = match[1] || match[2] || match[3] || match[4];
		if (ref && !refs.includes(ref)) {
			refs.push(ref);
		}
	}

	return refs;
}

/**
 * Maps GitLab category name to WNF category ID
 */
function mapCategoryToId(category: string | null): CategoryId {
	if (!category) return "features";

	const normalized = category.toLowerCase().trim();

	// Check direct mapping
	if (normalized in GITLAB_STAGE_MAP) {
		return GITLAB_STAGE_MAP[normalized];
	}

	// Check partial matches
	for (const [key, value] of Object.entries(GITLAB_STAGE_MAP)) {
		if (normalized.includes(key) || key.includes(normalized)) {
			return value;
		}
	}

	return "features";
}

/**
 * Cleans HTML tags from text
 */
function cleanHtml(text: string): string {
	return text
		.replace(/<[^>]+>/g, "") // Remove all HTML tags
		.replace(/\s+/g, " ") // Normalize whitespace
		.trim();
}

/**
 * Extracts standalone features not in details blocks
 * Fallback for simpler GitLab release formats
 */
function extractStandaloneFeatures(body: string): ExtractedItem[] {
	const items: ExtractedItem[] = [];

	// Look for bullet points with links
	const bulletPattern = /^[-*]\s+\[([^\]]+)\]\(([^)]+)\)/gm;

	for (const match of body.matchAll(bulletPattern)) {
		const [fullMatch, title, url] = match;

		items.push({
			text: title.trim(),
			refs: extractRefs(fullMatch),
			sourceHint: {
				section: "features",
				suggestedCategory: "features",
			},
			prUrl: url,
		});
	}

	return items;
}

/**
 * Extracts summary from the release body
 */
function extractSummary(body: string): string | undefined {
	// Skip shield badges and find first meaningful text
	const lines = body.split("\n");

	for (const line of lines) {
		const trimmed = line.trim();

		// Skip empty lines
		if (!trimmed) continue;

		// Skip shield badges
		if (PATTERNS.shieldBadge.test(trimmed)) continue;

		// Skip headers
		if (trimmed.startsWith("#")) continue;

		// Skip HTML tags
		if (trimmed.startsWith("<")) continue;

		// Found meaningful text
		return trimmed.slice(0, 200);
	}

	return undefined;
}
