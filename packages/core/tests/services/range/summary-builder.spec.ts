import type { Category, PackageChanges } from "@whatsnew/types";
import { describe, expect, it } from "vitest";
import {
	buildAggregatedSummary,
	buildCategorySummary,
} from "../../../src/services/range/summary-builder.js";

describe("buildAggregatedSummary", () => {
	const createPackage = (
		name: string,
		categories: Category[],
	): PackageChanges => ({
		name,
		isMain: false,
		categories,
		releases: [],
		releaseCount: 1,
		latestVersion: "1.0.0",
		confidence: 0.8,
	});

	describe("change counts", () => {
		it("counts breaking changes", () => {
			const packages = [
				createPackage("pkg", [
					{
						id: "breaking",
						title: "Breaking Changes",
						items: [{ text: "Change 1" }, { text: "Change 2" }],
					},
				]),
			];

			const result = buildAggregatedSummary(packages, 1);

			expect(result).toBe("2 breaking changes in 1 release");
		});

		it("counts features", () => {
			const packages = [
				createPackage("pkg", [
					{
						id: "features",
						title: "Features",
						items: [
							{ text: "Feature 1" },
							{ text: "Feature 2" },
							{ text: "Feature 3" },
						],
					},
				]),
			];

			const result = buildAggregatedSummary(packages, 2);

			expect(result).toBe("3 features in 2 releases");
		});

		it("counts fixes", () => {
			const packages = [
				createPackage("pkg", [
					{ id: "fixes", title: "Fixes", items: [{ text: "Fix 1" }] },
				]),
			];

			const result = buildAggregatedSummary(packages, 1);

			expect(result).toBe("1 fix in 1 release");
		});

		it("combines multiple change types", () => {
			const packages = [
				createPackage("pkg", [
					{ id: "breaking", title: "Breaking", items: [{ text: "Break" }] },
					{ id: "features", title: "Features", items: [{ text: "Feat" }] },
					{ id: "fixes", title: "Fixes", items: [{ text: "Fix" }] },
				]),
			];

			const result = buildAggregatedSummary(packages, 1);

			expect(result).toBe("1 breaking change, 1 feature, 1 fix in 1 release");
		});
	});

	describe("plural forms", () => {
		it("uses singular for 1 breaking change", () => {
			const packages = [
				createPackage("pkg", [
					{ id: "breaking", title: "Breaking", items: [{ text: "One" }] },
				]),
			];

			expect(buildAggregatedSummary(packages, 1)).toContain(
				"1 breaking change",
			);
		});

		it("uses plural for multiple breaking changes", () => {
			const packages = [
				createPackage("pkg", [
					{
						id: "breaking",
						title: "Breaking",
						items: [{ text: "One" }, { text: "Two" }],
					},
				]),
			];

			expect(buildAggregatedSummary(packages, 1)).toContain(
				"2 breaking changes",
			);
		});

		it("uses singular for 1 feature", () => {
			const packages = [
				createPackage("pkg", [
					{ id: "features", title: "Features", items: [{ text: "One" }] },
				]),
			];

			expect(buildAggregatedSummary(packages, 1)).toContain("1 feature");
		});

		it("uses fixes for multiple fixes", () => {
			const packages = [
				createPackage("pkg", [
					{
						id: "fixes",
						title: "Fixes",
						items: [{ text: "One" }, { text: "Two" }],
					},
				]),
			];

			expect(buildAggregatedSummary(packages, 1)).toContain("2 fixes");
		});

		it("uses singular for 1 release", () => {
			const packages = [
				createPackage("pkg", [
					{ id: "features", title: "Features", items: [{ text: "Feat" }] },
				]),
			];

			expect(buildAggregatedSummary(packages, 1)).toContain("in 1 release");
		});

		it("uses plural for multiple releases", () => {
			const packages = [
				createPackage("pkg", [
					{ id: "features", title: "Features", items: [{ text: "Feat" }] },
				]),
			];

			expect(buildAggregatedSummary(packages, 5)).toContain("in 5 releases");
		});
	});

	describe("package info", () => {
		it("includes package count for multiple packages", () => {
			const packages = [
				createPackage("pkg-a", [
					{ id: "features", title: "Features", items: [{ text: "Feat" }] },
				]),
				createPackage("pkg-b", [
					{ id: "fixes", title: "Fixes", items: [{ text: "Fix" }] },
				]),
			];

			const result = buildAggregatedSummary(packages, 2);

			expect(result).toContain("across 2 packages");
		});

		it("omits package count for single package", () => {
			const packages = [
				createPackage("pkg", [
					{ id: "features", title: "Features", items: [{ text: "Feat" }] },
				]),
			];

			const result = buildAggregatedSummary(packages, 1);

			expect(result).not.toContain("across");
			expect(result).not.toContain("packages");
		});
	});

	describe("fallback for other categories", () => {
		it("shows total changes when no standard categories", () => {
			const packages = [
				createPackage("pkg", [
					{
						id: "other",
						title: "Other",
						items: [{ text: "Change 1" }, { text: "Change 2" }],
					},
				]),
			];

			const result = buildAggregatedSummary(packages, 1);

			expect(result).toBe("2 changes in 1 release");
		});
	});

	describe("aggregation across packages", () => {
		it("sums changes across all packages", () => {
			const packages = [
				createPackage("pkg-a", [
					{
						id: "features",
						title: "Features",
						items: [{ text: "F1" }, { text: "F2" }],
					},
				]),
				createPackage("pkg-b", [
					{ id: "features", title: "Features", items: [{ text: "F3" }] },
				]),
			];

			const result = buildAggregatedSummary(packages, 3);

			expect(result).toBe("3 features across 2 packages in 3 releases");
		});
	});
});

describe("buildCategorySummary", () => {
	describe("change counts", () => {
		it("returns 'No changes documented' for empty categories", () => {
			expect(buildCategorySummary([])).toBe("No changes documented");
		});

		it("returns 'No changes documented' for categories with no items", () => {
			const categories: Category[] = [
				{ id: "features", title: "Features", items: [] },
			];

			expect(buildCategorySummary(categories)).toBe("No changes documented");
		});

		it("counts breaking changes", () => {
			const categories: Category[] = [
				{
					id: "breaking",
					title: "Breaking",
					items: [{ text: "B1" }, { text: "B2" }],
				},
			];

			expect(buildCategorySummary(categories)).toBe("2 breaking changes");
		});

		it("counts features", () => {
			const categories: Category[] = [
				{ id: "features", title: "Features", items: [{ text: "F1" }] },
			];

			expect(buildCategorySummary(categories)).toBe("1 feature");
		});

		it("counts fixes", () => {
			const categories: Category[] = [
				{
					id: "fixes",
					title: "Fixes",
					items: [{ text: "Fix1" }, { text: "Fix2" }, { text: "Fix3" }],
				},
			];

			expect(buildCategorySummary(categories)).toBe("3 fixes");
		});

		it("combines multiple categories", () => {
			const categories: Category[] = [
				{ id: "breaking", title: "Breaking", items: [{ text: "B" }] },
				{
					id: "features",
					title: "Features",
					items: [{ text: "F1" }, { text: "F2" }],
				},
				{ id: "fixes", title: "Fixes", items: [{ text: "Fix" }] },
			];

			expect(buildCategorySummary(categories)).toBe(
				"1 breaking change, 2 features, 1 fix",
			);
		});
	});

	describe("fallback for other categories", () => {
		it("shows total count for non-standard categories", () => {
			const categories: Category[] = [
				{
					id: "docs",
					title: "Documentation",
					items: [{ text: "D1" }, { text: "D2" }],
				},
				{ id: "chore", title: "Chores", items: [{ text: "C1" }] },
			];

			expect(buildCategorySummary(categories)).toBe("3 changes");
		});

		it("shows singular for 1 change", () => {
			const categories: Category[] = [
				{ id: "other", title: "Other", items: [{ text: "One" }] },
			];

			expect(buildCategorySummary(categories)).toBe("1 change");
		});
	});
});
