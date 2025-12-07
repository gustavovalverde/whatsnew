import type { SourceResult } from "@whatsnew/types";
import { describe, expect, it } from "vitest";
import { mergeWithCommits } from "../../../src/aggregator/pipeline/augment-commits.js";

describe("mergeWithCommits", () => {
	const createResult = (
		categories: SourceResult["categories"],
		confidence = 0.8,
	): SourceResult => ({
		categories,
		confidence,
	});

	describe("category priority sorting", () => {
		it("sorts merged categories by priority order", () => {
			// Primary has fixes first, then features (wrong order)
			const primary = createResult([
				{ id: "fixes", title: "Bug Fixes", items: [{ text: "Fix 1" }] },
				{ id: "features", title: "Features", items: [{ text: "Feature 1" }] },
			]);
			const commits = createResult([]);

			const result = mergeWithCommits(primary, commits);

			// After merge, features should come before fixes
			expect(result.categories[0].id).toBe("features");
			expect(result.categories[1].id).toBe("fixes");
		});

		it("maintains priority order: breaking > security > features > fixes", () => {
			const primary = createResult([
				{ id: "other", title: "Other", items: [{ text: "Other 1" }] },
				{ id: "fixes", title: "Bug Fixes", items: [{ text: "Fix 1" }] },
				{ id: "features", title: "Features", items: [{ text: "Feature 1" }] },
				{ id: "breaking", title: "Breaking", items: [{ text: "Breaking 1" }] },
			]);
			const commits = createResult([
				{ id: "security", title: "Security", items: [{ text: "Security 1" }] },
			]);

			const result = mergeWithCommits(primary, commits);

			const categoryOrder = result.categories.map((c) => c.id);
			expect(categoryOrder).toEqual([
				"breaking",
				"security",
				"features",
				"fixes",
				"other",
			]);
		});

		it("sorts correctly when commits add new categories", () => {
			const primary = createResult([
				{ id: "docs", title: "Docs", items: [{ text: "Doc 1" }] },
			]);
			const commits = createResult([
				{ id: "features", title: "Features", items: [{ text: "Feature 1" }] },
				{ id: "fixes", title: "Fixes", items: [{ text: "Fix 1" }] },
			]);

			const result = mergeWithCommits(primary, commits);

			const categoryOrder = result.categories.map((c) => c.id);
			expect(categoryOrder).toEqual(["features", "fixes", "docs"]);
		});
	});

	describe("deduplication", () => {
		it("deduplicates items by matching refs", () => {
			const primary = createResult([
				{
					id: "features",
					title: "Features",
					items: [{ text: "Feature A", refs: ["123"] }],
				},
			]);
			const commits = createResult([
				{
					id: "features",
					title: "Features",
					items: [{ text: "Same feature different text", refs: ["123"] }],
				},
			]);

			const result = mergeWithCommits(primary, commits);

			const features = result.categories.find((c) => c.id === "features");
			expect(features?.items).toHaveLength(1);
			expect(features?.items[0].text).toBe("Feature A");
		});
	});
});
