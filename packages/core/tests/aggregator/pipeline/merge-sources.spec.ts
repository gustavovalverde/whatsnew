import type { SourceResult } from "@whatsnew/types";
import { describe, expect, it } from "vitest";
import { mergeSources } from "../../../src/aggregator/pipeline/merge-sources.js";
import { createPipelineContext } from "../../../src/aggregator/pipeline/types.js";

describe("mergeSources", () => {
	const createResult = (
		categories: SourceResult["categories"] = [],
		confidence = 0.8,
	): SourceResult => ({
		categories,
		confidence,
	});

	describe("with both primary and commit results", () => {
		it("merges results when both exist", () => {
			const primaryResult = createResult([
				{ id: "features", title: "Features", items: [{ text: "Feature A" }] },
			]);
			const commitResult = createResult([
				{ id: "features", title: "Features", items: [{ text: "Feature B" }] },
			]);

			let ctx = createPipelineContext("owner", "repo");
			ctx = { ...ctx, primaryResult, commitResult };

			const result = mergeSources(ctx);

			expect(result.finalResult).not.toBeNull();
			const features = result.finalResult?.categories.find(
				(c) => c.id === "features",
			);
			expect(features?.items).toHaveLength(2);
		});

		it("deduplicates items with matching refs", () => {
			const primaryResult = createResult([
				{
					id: "features",
					title: "Features",
					items: [{ text: "Feature A", refs: ["#123"] }],
				},
			]);
			const commitResult = createResult([
				{
					id: "features",
					title: "Features",
					items: [{ text: "Same feature", refs: ["#123"] }],
				},
			]);

			let ctx = createPipelineContext("owner", "repo");
			ctx = { ...ctx, primaryResult, commitResult };

			const result = mergeSources(ctx);

			const features = result.finalResult?.categories.find(
				(c) => c.id === "features",
			);
			expect(features?.items).toHaveLength(1);
			expect(features?.items[0].text).toBe("Feature A");
		});
	});

	describe("with only primary result", () => {
		it("uses primary result as final", () => {
			const primaryResult = createResult([
				{ id: "fixes", title: "Fixes", items: [{ text: "Fix 1" }] },
			]);

			let ctx = createPipelineContext("owner", "repo");
			ctx = { ...ctx, primaryResult };

			const result = mergeSources(ctx);

			expect(result.finalResult).toBe(primaryResult);
		});
	});

	describe("with only commit result", () => {
		it("uses commit result as final", () => {
			const commitResult = createResult([
				{
					id: "features",
					title: "Features",
					items: [{ text: "Commit feature" }],
				},
			]);

			let ctx = createPipelineContext("owner", "repo");
			ctx = { ...ctx, commitResult };

			const result = mergeSources(ctx);

			expect(result.finalResult).toBe(commitResult);
		});
	});

	describe("with no results", () => {
		it("leaves finalResult as null", () => {
			const ctx = createPipelineContext("owner", "repo");

			const result = mergeSources(ctx);

			expect(result.finalResult).toBeNull();
		});
	});

	describe("confidence handling", () => {
		it("takes max confidence from merged results", () => {
			const primaryResult = createResult([], 0.6);
			const commitResult = createResult([], 0.9);

			let ctx = createPipelineContext("owner", "repo");
			ctx = { ...ctx, primaryResult, commitResult };

			const result = mergeSources(ctx);

			expect(result.finalResult?.confidence).toBe(0.9);
		});
	});
});
