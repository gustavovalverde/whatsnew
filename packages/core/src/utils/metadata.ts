import type { Category } from "@whatsnew/types";

/**
 * Extracts a summary from the release body text
 *
 * Takes the first non-empty line as the summary. This provides a quick
 * one-line description of the release.
 *
 * @param body - The release body text
 * @returns The extracted summary or a default message
 *
 * @example
 * ```typescript
 * const summary = extractSummary("This is a major release\n\nWith many changes");
 * // Returns: "This is a major release"
 * ```
 */
export function extractSummary(body: string): string {
	const lines = body.split("\n").filter((line) => line.trim());
	return lines[0] || "No summary available";
}

/**
 * Formats a category ID into a human-readable title
 *
 * Converts category identifiers (e.g., "breaking", "features") into
 * properly formatted titles (e.g., "Breaking Changes", "Features").
 *
 * @param id - The category identifier
 * @returns The formatted title string
 *
 * @example
 * ```typescript
 * formatCategoryTitle("breaking"); // Returns: "Breaking Changes"
 * formatCategoryTitle("features"); // Returns: "Features"
 * ```
 */
export function formatCategoryTitle(id: Category["id"]): string {
	const titles: Record<Category["id"], string> = {
		breaking: "Breaking Changes",
		features: "Features",
		fixes: "Bug Fixes",
		security: "Security",
		perf: "Performance",
		deps: "Dependencies",
		docs: "Documentation",
		refactor: "Refactoring",
		chore: "Chores",
		other: "Other",
	};
	return titles[id] || id;
}
