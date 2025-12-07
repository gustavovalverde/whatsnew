/**
 * Terminal text formatter with colors and box drawing
 */

import type {
	Category,
	PackageChanges,
	WNFAggregatedDocument,
	WNFDocument,
} from "@whatsnew/types";
import { box, colors } from "../utils/colors.js";

const CATEGORY_COLORS: Record<string, (text: string) => string> = {
	breaking: colors.red,
	features: colors.green,
	fixes: colors.yellow,
	security: colors.magenta,
	perf: colors.cyan,
	deps: colors.blue,
	docs: colors.gray,
	refactor: colors.gray,
	chore: colors.gray,
	other: colors.gray,
};

const CATEGORY_ICONS: Record<string, string> = {
	breaking: "!!",
	features: "+",
	fixes: "*",
	security: "!",
	perf: ">",
	deps: "@",
	docs: "#",
	refactor: "~",
	chore: ".",
	other: "-",
};

function formatHeader(doc: WNFDocument | WNFAggregatedDocument): string {
	const width = 60;
	const repo = doc.source.repo;

	let title: string;
	if ("version" in doc && doc.version) {
		title = `${repo} ${doc.version}`;
	} else if ("releaseCount" in doc) {
		const pkgCount =
			"packages" in doc && doc.packages.length > 1
				? ` • ${doc.packages.length} packages`
				: "";
		title = `${repo} (${doc.releaseCount} releases${pkgCount})`;
	} else {
		title = repo;
	}

	const paddedTitle = ` ${title} `.padEnd(width - 2);

	return [
		colors.dim(
			`${box.topLeft}${box.horizontal.repeat(width - 2)}${box.topRight}`,
		),
		colors.dim(box.vertical) +
			colors.bold(paddedTitle) +
			colors.dim(box.vertical),
		colors.dim(
			`${box.teeRight}${box.horizontal.repeat(width - 2)}${box.teeLeft}`,
		),
	].join("\n");
}

function formatCategory(category: Category, indent = ""): string {
	const colorFn = CATEGORY_COLORS[category.id] || colors.white;
	const icon = CATEGORY_ICONS[category.id] || "-";
	const lines: string[] = [];

	lines.push(
		colors.dim(box.vertical) +
			indent +
			" " +
			colorFn(colors.bold(category.title)),
	);

	for (const item of category.items) {
		const prefix = item.breaking
			? colors.red(`[${icon}]`)
			: colors.dim(`[${icon}]`);
		const refs = item.refs?.length
			? colors.dim(` (${item.refs.join(", ")})`)
			: "";
		const scope = item.scope ? colors.cyan(`[${item.scope}] `) : "";

		lines.push(
			colors.dim(box.vertical) +
				indent +
				`   ${prefix} ${scope}${item.text}${refs}`,
		);
	}

	return lines.join("\n");
}

function formatPackage(pkg: PackageChanges): string {
	const lines: string[] = [];
	const mainBadge = pkg.isMain ? colors.cyan(" [main]") : "";
	const versionInfo = pkg.latestVersion
		? colors.dim(` @ ${pkg.latestVersion}`)
		: "";

	// Package header
	lines.push(colors.dim(box.vertical));
	lines.push(
		colors.dim(box.vertical) +
			" " +
			colors.bold(colors.white(pkg.name)) +
			mainBadge +
			versionInfo +
			colors.dim(` (${pkg.releaseCount} releases)`),
	);

	// Package categories
	const nonEmptyCategories = pkg.categories.filter((c) => c.items.length > 0);
	if (nonEmptyCategories.length === 0) {
		lines.push(colors.dim(box.vertical) + colors.dim("    No changes parsed"));
	} else {
		for (const category of nonEmptyCategories) {
			lines.push(formatCategory(category, "  "));
		}
	}

	return lines.join("\n");
}

function formatCategories(categories: Category[]): string {
	const lines: string[] = [];
	const nonEmptyCategories = categories.filter((c) => c.items.length > 0);

	if (nonEmptyCategories.length === 0) {
		lines.push(colors.dim(box.vertical) + colors.dim("  No changes found"));
	} else {
		for (const category of nonEmptyCategories) {
			lines.push(formatCategory(category));
		}
	}

	return lines.join("\n");
}

/**
 * Threshold for displaying quality warning.
 * When more than 20% of items are terse (< 15 chars), show a quality note.
 *
 * @see packages/utils/src/item-quality.ts for TERSE_PENALTY_THRESHOLD
 */
const TERSE_WARNING_THRESHOLD = 0.2;

function formatFooter(doc: WNFDocument | WNFAggregatedDocument): string {
	const width = 60;
	const confidence = Math.round(doc.confidence * 100);
	const sources = doc.generatedFrom.join(", ");

	const footer = `Confidence: ${confidence}% | Sources: ${sources}`;
	const paddedFooter = ` ${footer} `.slice(0, width - 2).padEnd(width - 2);

	const lines = [
		colors.dim(
			`${box.teeRight}${box.horizontal.repeat(width - 2)}${box.teeLeft}`,
		),
		colors.dim(box.vertical) +
			colors.dim(paddedFooter) +
			colors.dim(box.vertical),
	];

	// Show quality warning when terseRatio exceeds threshold
	// This indicates many items have minimal descriptions (< 15 chars)
	const breakdown =
		"confidenceBreakdown" in doc ? doc.confidenceBreakdown : undefined;
	if (breakdown && breakdown.terseRatio > TERSE_WARNING_THRESHOLD) {
		const tersePercent = Math.round(breakdown.terseRatio * 100);
		const qualityNote = `Note: ${tersePercent}% of entries have minimal descriptions`;
		const paddedNote = ` ${qualityNote} `.slice(0, width - 2).padEnd(width - 2);
		lines.push(
			colors.dim(box.vertical) +
				colors.yellow(paddedNote) +
				colors.dim(box.vertical),
		);
	}

	lines.push(
		colors.dim(
			`${box.bottomLeft}${box.horizontal.repeat(width - 2)}${box.bottomRight}`,
		),
	);

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

export function formatText(doc: WNFDocument | WNFAggregatedDocument): string {
	const lines: string[] = [];

	lines.push(formatHeader(doc));

	// Handle package-first structure for aggregated documents
	if (isAggregatedDocument(doc)) {
		if (doc.packages.length === 0) {
			lines.push(colors.dim(box.vertical) + colors.dim("  No changes found"));
		} else {
			for (const pkg of doc.packages) {
				lines.push(formatPackage(pkg));
			}
		}
	} else {
		// Single release document - use categories directly
		lines.push(formatCategories(doc.categories));
	}

	// Add notes if present (only for single release docs)
	if (!isAggregatedDocument(doc) && doc.notes && doc.notes.length > 0) {
		lines.push(colors.dim(box.vertical));
		lines.push(
			`${colors.dim(box.vertical)} ${colors.yellow(colors.bold("Notes"))}`,
		);
		for (const note of doc.notes) {
			const prefix =
				note.type === "migration" ? colors.yellow("[!]") : colors.dim("[i]");
			lines.push(`${colors.dim(box.vertical)}   ${prefix} ${note.text}`);
		}
	}

	lines.push(formatFooter(doc));

	// Add summary below box if present
	if (doc.summary) {
		lines.push("");
		lines.push(colors.dim("Summary: ") + doc.summary);
	}

	return lines.join("\n");
}
