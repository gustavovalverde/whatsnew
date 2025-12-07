/**
 * Markdown formatter
 */

import type {
	Category,
	PackageChanges,
	WNFAggregatedDocument,
	WNFDocument,
} from "@whatsnew/types";

function formatCategory(category: Category, headingLevel = 3): string {
	const lines: string[] = [];
	const heading = "#".repeat(headingLevel);

	lines.push(`${heading} ${category.title}`);
	lines.push("");

	for (const item of category.items) {
		const refs = item.refs?.length ? ` (${item.refs.join(", ")})` : "";
		const scope = item.scope ? `**[${item.scope}]** ` : "";
		const breaking = item.breaking ? "**BREAKING:** " : "";

		lines.push(`- ${breaking}${scope}${item.text}${refs}`);
	}

	lines.push("");
	return lines.join("\n");
}

function formatPackage(pkg: PackageChanges): string {
	const lines: string[] = [];

	// Package header
	const mainBadge = pkg.isMain ? " _(main)_" : "";
	const versionInfo = pkg.latestVersion ? ` @ ${pkg.latestVersion}` : "";
	lines.push(`## ${pkg.name}${mainBadge}${versionInfo}`);
	lines.push("");
	lines.push(`_${pkg.releaseCount} release${pkg.releaseCount > 1 ? "s" : ""}_`);
	lines.push("");

	// Package categories
	const nonEmptyCategories = pkg.categories.filter((c) => c.items.length > 0);

	if (nonEmptyCategories.length === 0) {
		lines.push("_No changes parsed_");
		lines.push("");
	} else {
		for (const category of nonEmptyCategories) {
			lines.push(formatCategory(category, 3));
		}
	}

	return lines.join("\n");
}

/**
 * Check if document is an aggregated document with packages
 */
function isAggregatedDocument(
	doc: WNFDocument | WNFAggregatedDocument,
): doc is WNFAggregatedDocument {
	return "packages" in doc && Array.isArray(doc.packages);
}

export function formatMarkdown(
	doc: WNFDocument | WNFAggregatedDocument,
): string {
	const lines: string[] = [];

	// Header
	if ("version" in doc && doc.version) {
		lines.push(`# ${doc.source.repo} ${doc.version}`);
	} else if ("releaseCount" in doc) {
		const pkgInfo =
			isAggregatedDocument(doc) && doc.packages.length > 1
				? `, ${doc.packages.length} packages`
				: "";
		lines.push(`# ${doc.source.repo} (${doc.releaseCount} releases${pkgInfo})`);
	} else {
		lines.push(`# ${doc.source.repo}`);
	}
	lines.push("");

	// Summary
	if (doc.summary) {
		lines.push(`> ${doc.summary}`);
		lines.push("");
	}

	// Handle package-first structure for aggregated documents
	if (isAggregatedDocument(doc)) {
		if (doc.packages.length === 0) {
			lines.push("_No changes found_");
			lines.push("");
		} else {
			for (const pkg of doc.packages) {
				lines.push(formatPackage(pkg));
			}
		}
	} else {
		// Single release document - use categories directly
		const nonEmptyCategories = doc.categories.filter((c) => c.items.length > 0);

		if (nonEmptyCategories.length === 0) {
			lines.push("_No changes found_");
			lines.push("");
		} else {
			for (const category of nonEmptyCategories) {
				lines.push(formatCategory(category, 2));
			}
		}
	}

	// Notes (only for single release docs)
	if (!isAggregatedDocument(doc) && doc.notes && doc.notes.length > 0) {
		lines.push("## Notes");
		lines.push("");
		for (const note of doc.notes) {
			const prefix =
				note.type === "migration" ? "**Migration:**" : `**${note.type}:**`;
			lines.push(`- ${prefix} ${note.text}`);
		}
		lines.push("");
	}

	// Footer
	lines.push("---");
	lines.push("");
	lines.push(
		`_Confidence: ${Math.round(doc.confidence * 100)}% | Sources: ${doc.generatedFrom.join(", ")}_`,
	);

	// Show quality warning when terseRatio exceeds threshold (20%)
	// This indicates many items have minimal descriptions (< 15 chars)
	const breakdown =
		"confidenceBreakdown" in doc ? doc.confidenceBreakdown : undefined;
	if (breakdown && breakdown.terseRatio > 0.2) {
		const tersePercent = Math.round(breakdown.terseRatio * 100);
		lines.push("");
		lines.push(
			`> ⚠️ **Note:** ${tersePercent}% of entries have minimal descriptions`,
		);
	}

	return lines.join("\n");
}
