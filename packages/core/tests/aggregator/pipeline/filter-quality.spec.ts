import type { SourceResult } from "@whatsnew/types";
import { describe, expect, it } from "vitest";
import {
	filterLowQualityItems,
	filterQuality,
} from "../../../src/aggregator/pipeline/filter-quality.js";
import { createPipelineContext } from "../../../src/aggregator/pipeline/types.js";

describe("filterLowQualityItems", () => {
	const createResult = (
		categories: SourceResult["categories"],
	): SourceResult => ({
		categories,
		confidence: 0.8,
	});

	describe("score-based filtering", () => {
		it("keeps items with score >= 0.25", () => {
			const result = createResult([
				{
					id: "features",
					title: "Features",
					items: [{ text: "Good feature", score: 0.5 }],
				},
			]);

			const filtered = filterLowQualityItems(result);

			expect(filtered.categories[0].items).toHaveLength(1);
		});

		it("removes items with score < 0.25", () => {
			const result = createResult([
				{
					id: "features",
					title: "Features",
					items: [{ text: "Low quality", score: 0.1 }],
				},
			]);

			const filtered = filterLowQualityItems(result);

			expect(filtered.categories).toHaveLength(0);
		});

		it("keeps items at exactly 0.25 threshold", () => {
			const result = createResult([
				{
					id: "features",
					title: "Features",
					items: [{ text: "Borderline", score: 0.25 }],
				},
			]);

			const filtered = filterLowQualityItems(result);

			expect(filtered.categories[0].items).toHaveLength(1);
		});
	});

	describe("validation-based filtering", () => {
		it("validates items without scores", () => {
			const result = createResult([
				{
					id: "features",
					title: "Features",
					items: [{ text: "Add new authentication system for users" }],
				},
			]);

			const filtered = filterLowQualityItems(result);

			expect(filtered.categories[0].items).toHaveLength(1);
		});

		it("removes invalid items without scores", () => {
			const result = createResult([
				{
					id: "features",
					title: "Features",
					items: [{ text: "x" }], // Too short to be valid
				},
			]);

			const filtered = filterLowQualityItems(result);

			expect(filtered.categories).toHaveLength(0);
		});
	});

	describe("empty category removal", () => {
		it("removes categories that become empty after filtering", () => {
			const result = createResult([
				{
					id: "features",
					title: "Features",
					items: [{ text: "Low", score: 0.1 }],
				},
				{
					id: "fixes",
					title: "Fixes",
					items: [{ text: "Good fix", score: 0.8 }],
				},
			]);

			const filtered = filterLowQualityItems(result);

			expect(filtered.categories).toHaveLength(1);
			expect(filtered.categories[0].id).toBe("fixes");
		});
	});

	describe("mixed items", () => {
		it("filters within categories preserving good items", () => {
			const result = createResult([
				{
					id: "features",
					title: "Features",
					items: [
						{ text: "Good one", score: 0.8 },
						{ text: "Bad one", score: 0.1 },
						{ text: "Another good one", score: 0.6 },
					],
				},
			]);

			const filtered = filterLowQualityItems(result);

			expect(filtered.categories[0].items).toHaveLength(2);
			expect(filtered.categories[0].items.map((i) => i.text)).toEqual([
				"Good one",
				"Another good one",
			]);
		});
	});
});

describe("filterQuality", () => {
	it("filters finalResult in pipeline context", () => {
		const finalResult: SourceResult = {
			categories: [
				{
					id: "features",
					title: "Features",
					items: [
						{ text: "Good", score: 0.8 },
						{ text: "Bad", score: 0.1 },
					],
				},
			],
			confidence: 0.8,
		};

		let ctx = createPipelineContext("owner", "repo");
		ctx = { ...ctx, finalResult };

		const result = filterQuality(ctx);

		expect(result.finalResult?.categories[0].items).toHaveLength(1);
	});

	it("returns unchanged context when finalResult is null", () => {
		const ctx = createPipelineContext("owner", "repo");

		const result = filterQuality(ctx);

		expect(result.finalResult).toBeNull();
	});

	it("preserves other context properties", () => {
		const finalResult: SourceResult = {
			categories: [],
			confidence: 0.8,
		};

		let ctx = createPipelineContext("owner", "repo", "v1.0.0");
		ctx = { ...ctx, finalResult, aiEnhanced: true, sourcesUsed: ["github"] };

		const result = filterQuality(ctx);

		expect(result.owner).toBe("owner");
		expect(result.repo).toBe("repo");
		expect(result.tag).toBe("v1.0.0");
		expect(result.aiEnhanced).toBe(true);
		expect(result.sourcesUsed).toEqual(["github"]);
	});
});
