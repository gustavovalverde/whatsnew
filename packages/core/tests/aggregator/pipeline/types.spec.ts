import { describe, expect, it } from "vitest";
import {
	addSource,
	createPipelineContext,
	hasValidResult,
} from "../../../src/aggregator/pipeline/types.js";

describe("createPipelineContext", () => {
	it("creates context with owner, repo, and tag", () => {
		const ctx = createPipelineContext("owner", "repo", "v1.0.0");

		expect(ctx.owner).toBe("owner");
		expect(ctx.repo).toBe("repo");
		expect(ctx.tag).toBe("v1.0.0");
	});

	it("creates context with optional tag undefined", () => {
		const ctx = createPipelineContext("owner", "repo");

		expect(ctx.tag).toBeUndefined();
	});

	it("initializes with null results", () => {
		const ctx = createPipelineContext("owner", "repo");

		expect(ctx.primaryResult).toBeNull();
		expect(ctx.commitResult).toBeNull();
		expect(ctx.finalResult).toBeNull();
	});

	it("initializes with empty sources array", () => {
		const ctx = createPipelineContext("owner", "repo");

		expect(ctx.sourcesUsed).toEqual([]);
	});

	it("initializes aiEnhanced as false", () => {
		const ctx = createPipelineContext("owner", "repo");

		expect(ctx.aiEnhanced).toBe(false);
	});
});

describe("addSource", () => {
	it("adds source to empty sources array", () => {
		const ctx = createPipelineContext("owner", "repo");
		const updated = addSource(ctx, "github.release");

		expect(updated.sourcesUsed).toEqual(["github.release"]);
	});

	it("preserves existing sources when adding new one", () => {
		let ctx = createPipelineContext("owner", "repo");
		ctx = addSource(ctx, "github.release");
		ctx = addSource(ctx, "commits");

		expect(ctx.sourcesUsed).toEqual(["github.release", "commits"]);
	});

	it("does not mutate original context", () => {
		const original = createPipelineContext("owner", "repo");
		const updated = addSource(original, "source");

		expect(original.sourcesUsed).toEqual([]);
		expect(updated.sourcesUsed).toEqual(["source"]);
	});

	it("preserves other context properties", () => {
		const ctx = createPipelineContext("owner", "repo", "v1.0.0");
		const updated = addSource(ctx, "source");

		expect(updated.owner).toBe("owner");
		expect(updated.repo).toBe("repo");
		expect(updated.tag).toBe("v1.0.0");
	});
});

describe("hasValidResult", () => {
	it("returns false for null", () => {
		expect(hasValidResult(null)).toBe(false);
	});

	it("returns true for valid result with categories", () => {
		const result = {
			categories: [{ id: "features", title: "Features", items: [] }],
			confidence: 0.8,
		};

		expect(hasValidResult(result)).toBe(true);
	});

	it("returns true for result with empty categories array", () => {
		const result = {
			categories: [],
			confidence: 0.5,
		};

		expect(hasValidResult(result)).toBe(true);
	});
});
