/**
 * Summary builder for aggregated release documents
 */

import type { Category, PackageChanges } from "@whatsnew/types";

/**
 * Generates a human-readable summary for package-grouped aggregated releases.
 *
 * @param packages - Array of package changes
 * @param releaseCount - Total number of releases
 * @returns Summary string (e.g., "3 breaking changes, 5 features across 2 packages in 4 releases")
 */
export function buildAggregatedSummary(
	packages: PackageChanges[],
	releaseCount: number,
): string {
	// Count changes across all packages
	let breakingCount = 0;
	let featureCount = 0;
	let fixCount = 0;
	let totalChanges = 0;

	for (const pkg of packages) {
		for (const cat of pkg.categories) {
			totalChanges += cat.items.length;
			if (cat.id === "breaking") breakingCount += cat.items.length;
			if (cat.id === "features") featureCount += cat.items.length;
			if (cat.id === "fixes") fixCount += cat.items.length;
		}
	}

	const parts: string[] = [];

	if (breakingCount > 0) {
		parts.push(
			`${breakingCount} breaking change${breakingCount > 1 ? "s" : ""}`,
		);
	}
	if (featureCount > 0) {
		parts.push(`${featureCount} feature${featureCount > 1 ? "s" : ""}`);
	}
	if (fixCount > 0) {
		parts.push(`${fixCount} fix${fixCount > 1 ? "es" : ""}`);
	}

	const changeSummary =
		parts.length > 0 ? parts.join(", ") : `${totalChanges} changes`;

	const packageInfo =
		packages.length > 1 ? ` across ${packages.length} packages` : "";

	return `${changeSummary}${packageInfo} in ${releaseCount} release${releaseCount > 1 ? "s" : ""}`;
}

/**
 * Generates a summary from categorized items.
 *
 * @param categories - Array of categories with items
 * @returns Summary string (e.g., "2 breaking changes, 3 features, 1 fix")
 */
export function buildCategorySummary(categories: Category[]): string {
	const totalItems = categories.reduce(
		(sum: number, cat: Category) => sum + cat.items.length,
		0,
	);

	if (totalItems === 0) {
		return "No changes documented";
	}

	const breakingCount =
		categories.find((c: Category) => c.id === "breaking")?.items.length || 0;
	const featuresCount =
		categories.find((c: Category) => c.id === "features")?.items.length || 0;
	const fixesCount =
		categories.find((c: Category) => c.id === "fixes")?.items.length || 0;

	const parts: string[] = [];

	if (breakingCount > 0) {
		parts.push(
			`${breakingCount} breaking change${breakingCount > 1 ? "s" : ""}`,
		);
	}
	if (featuresCount > 0) {
		parts.push(`${featuresCount} feature${featuresCount > 1 ? "s" : ""}`);
	}
	if (fixesCount > 0) {
		parts.push(`${fixesCount} fix${fixesCount > 1 ? "es" : ""}`);
	}

	if (parts.length === 0) {
		return `${totalItems} change${totalItems > 1 ? "s" : ""}`;
	}

	return parts.join(", ");
}
