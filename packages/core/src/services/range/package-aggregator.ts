/**
 * Package aggregation for release range queries
 * Groups releases by package name and merges categories with deduplication
 */

import type { Category, PackageChanges, ReleaseSummary } from "@whatsnew/types";
import { extractPackageName } from "@whatsnew/utils";

/**
 * A release with pre-parsed categories and confidence
 */
export interface ParsedRelease {
	tag_name: string;
	published_at: string;
	html_url: string;
	categories: Category[];
	confidence: number;
}

/**
 * Internal structure for tracking package data during aggregation
 */
interface PackageData {
	releases: ParsedRelease[];
	categoryMap: Map<Category["id"], Category>;
	totalConfidence: number;
	latestVersion: string;
}

/**
 * Result of package aggregation
 */
export interface AggregationResult {
	packages: PackageChanges[];
	allReleaseSummaries: ReleaseSummary[];
}

/**
 * Aggregates parsed releases by package name and merges their categories.
 * Handles monorepo packages (e.g., @ai-sdk/anthropic@3.0.0) and simple tags (e.g., v1.0.0).
 */
export class PackageAggregator {
	private readonly repoName: string;

	constructor(repoName: string) {
		this.repoName = repoName;
	}

	/**
	 * Aggregates pre-parsed releases into package-grouped structure.
	 *
	 * @param releases - Parsed releases with categories already extracted
	 * @returns Aggregated packages and flat list of release summaries
	 */
	aggregate(releases: ParsedRelease[]): AggregationResult {
		const packageMap = new Map<string, PackageData>();
		const allReleaseSummaries: ReleaseSummary[] = [];

		for (const release of releases) {
			const packageName = this.extractPackageNameFromTag(release.tag_name);
			const pkgData = this.getOrCreatePackageData(
				packageMap,
				packageName,
				release.tag_name,
			);

			pkgData.releases.push(release);
			pkgData.totalConfidence += release.confidence;

			this.mergeCategories(pkgData.categoryMap, release.categories);

			allReleaseSummaries.push({
				tag: release.tag_name,
				version: this.extractVersion(release.tag_name),
				releasedAt: release.published_at,
				url: release.html_url,
				packageName,
			});
		}

		const packages = this.buildPackageChanges(packageMap);

		return { packages, allReleaseSummaries };
	}

	/**
	 * Extracts package name from tag.
	 * For scoped tags like "@ai-sdk/anthropic@3.0.0", returns "@ai-sdk/anthropic".
	 * For simple tags like "v1.0.0", returns the repo name.
	 */
	private extractPackageNameFromTag(tagName: string): string {
		return extractPackageName(tagName) || this.repoName;
	}

	/**
	 * Extracts version from tag name.
	 * Removes "v" prefix and scoped package prefixes.
	 */
	private extractVersion(tagName: string): string {
		return tagName.replace(/^v/, "").replace(/^@?[^@]+@/, "");
	}

	/**
	 * Gets or creates package data entry in the map.
	 */
	private getOrCreatePackageData(
		packageMap: Map<string, PackageData>,
		packageName: string,
		tagName: string,
	): PackageData {
		if (!packageMap.has(packageName)) {
			packageMap.set(packageName, {
				releases: [],
				categoryMap: new Map(),
				totalConfidence: 0,
				latestVersion: this.extractVersion(tagName),
			});
		}
		// biome-ignore lint/style/noNonNullAssertion: just set above, guaranteed to exist
		return packageMap.get(packageName)!;
	}

	/**
	 * Merges categories into the category map with deduplication.
	 * Items with the same text are not added twice.
	 */
	private mergeCategories(
		categoryMap: Map<Category["id"], Category>,
		categories: Category[],
	): void {
		for (const category of categories) {
			const existing = categoryMap.get(category.id);
			if (existing) {
				const existingTexts = new Set(existing.items.map((i) => i.text));
				for (const item of category.items) {
					if (!existingTexts.has(item.text)) {
						existing.items.push(item);
					}
				}
			} else {
				categoryMap.set(category.id, {
					...category,
					items: [...category.items],
				});
			}
		}
	}

	/**
	 * Builds PackageChanges array from the package map.
	 * Sorts packages with main package first, then alphabetically.
	 */
	private buildPackageChanges(
		packageMap: Map<string, PackageData>,
	): PackageChanges[] {
		const packages: PackageChanges[] = [];

		for (const [packageName, pkgData] of packageMap) {
			const isMain = this.isMainPackage(packageName, pkgData.releases);

			const pkgReleases: ReleaseSummary[] = pkgData.releases.map((r) => ({
				tag: r.tag_name,
				version: this.extractVersion(r.tag_name),
				releasedAt: r.published_at,
				url: r.html_url,
				packageName,
			}));

			packages.push({
				name: packageName,
				isMain,
				categories: Array.from(pkgData.categoryMap.values()),
				releases: pkgReleases,
				releaseCount: pkgData.releases.length,
				latestVersion: pkgData.latestVersion,
				confidence:
					pkgData.releases.length > 0
						? pkgData.totalConfidence / pkgData.releases.length
						: 0,
			});
		}

		// Sort: main package first, then alphabetically
		packages.sort((a, b) => {
			if (a.isMain && !b.isMain) return -1;
			if (!a.isMain && b.isMain) return 1;
			return a.name.localeCompare(b.name);
		});

		return packages;
	}

	/**
	 * Determines if a package is the "main" package.
	 * Main package: matches repo name or has unscoped tags (e.g., "v1.0.0").
	 */
	private isMainPackage(
		packageName: string,
		releases: ParsedRelease[],
	): boolean {
		return (
			packageName === this.repoName ||
			releases.some((r) => /^v?\d/.test(r.tag_name))
		);
	}
}
