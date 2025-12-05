import type { WNFAggregatedDocument, WNFDocument } from "@whatsnew/types";
import { describe, expect, it } from "vitest";
import { formatJson } from "../../src/formatters/json.js";

describe("formatJson", () => {
	const mockDocument: WNFDocument = {
		spec: "wnf/0.1",
		source: {
			platform: "github",
			repo: "vercel/ai",
			tag: "v4.0.0",
		},
		version: "v4.0.0",
		releasedAt: "2024-06-15T12:00:00Z",
		summary: "Major release with new features",
		categories: [
			{
				id: "features",
				title: "Features",
				items: [
					{
						text: "Add new API endpoint",
						refs: ["#123"],
						scope: "api",
					},
				],
			},
			{
				id: "fixes",
				title: "Bug Fixes",
				items: [
					{
						text: "Fix memory leak",
						refs: ["#456"],
						breaking: false,
					},
				],
			},
		],
		notes: [
			{
				type: "migration",
				text: "Update your config file",
			},
		],
		links: {
			release: "https://github.com/vercel/ai/releases/tag/v4.0.0",
			compare: "https://github.com/vercel/ai/compare/v3.0.0...v4.0.0",
		},
		confidence: 0.85,
		generatedFrom: ["github-release", "changelog-file"],
		generatedAt: "2024-06-15T12:00:00Z",
	};

	const mockAggregatedDocument: WNFAggregatedDocument = {
		spec: "wnf/0.1",
		source: {
			platform: "github",
			repo: "vercel/ai",
			dateRange: {
				since: "2024-01-01T00:00:00Z",
				until: "2024-06-15T00:00:00Z",
			},
		},
		summary: "5 releases with new features",
		packages: [
			{
				name: "ai",
				isMain: true,
				categories: [
					{
						id: "features",
						title: "Features",
						items: [{ text: "Add new feature", refs: ["#100"] }],
					},
				],
				releases: [
					{
						tag: "v4.0.0",
						version: "4.0.0",
						releasedAt: "2024-06-15T12:00:00Z",
						url: "https://github.com/vercel/ai/releases/tag/v4.0.0",
					},
				],
				releaseCount: 1,
				latestVersion: "4.0.0",
				confidence: 0.9,
			},
		],
		releases: [
			{
				tag: "v4.0.0",
				version: "4.0.0",
				releasedAt: "2024-06-15T12:00:00Z",
				url: "https://github.com/vercel/ai/releases/tag/v4.0.0",
			},
		],
		releaseCount: 1,
		links: {
			releases: "https://github.com/vercel/ai/releases",
		},
		confidence: 0.9,
		generatedFrom: ["github-release"],
		generatedAt: "2024-06-15T12:00:00Z",
	};

	it("formats WNFDocument as pretty-printed JSON", () => {
		const result = formatJson(mockDocument);

		expect(result).toContain('"spec": "wnf/0.1"');
		expect(result).toContain('"repo": "vercel/ai"');
		expect(result).toContain('"version": "v4.0.0"');
	});

	it("formats WNFAggregatedDocument as pretty-printed JSON", () => {
		const result = formatJson(mockAggregatedDocument);

		expect(result).toContain('"spec": "wnf/0.1"');
		expect(result).toContain('"packages"');
		expect(result).toContain('"releaseCount": 1');
	});

	it("preserves all document fields", () => {
		const result = formatJson(mockDocument);
		const parsed = JSON.parse(result);

		expect(parsed.spec).toBe("wnf/0.1");
		expect(parsed.source.platform).toBe("github");
		expect(parsed.categories).toHaveLength(2);
		expect(parsed.notes).toHaveLength(1);
		expect(parsed.confidence).toBe(0.85);
	});

	it("uses 2-space indentation", () => {
		const result = formatJson(mockDocument);

		// Check for 2-space indentation pattern
		expect(result).toContain('  "spec"');
	});

	it("returns valid JSON that can be parsed", () => {
		const result = formatJson(mockDocument);

		expect(() => JSON.parse(result)).not.toThrow();
	});

	it("handles empty categories", () => {
		const docWithEmptyCategories: WNFDocument = {
			...mockDocument,
			categories: [],
		};

		const result = formatJson(docWithEmptyCategories);
		const parsed = JSON.parse(result);

		expect(parsed.categories).toEqual([]);
	});

	it("handles undefined optional fields", () => {
		const minimalDoc: WNFDocument = {
			spec: "wnf/0.1",
			source: {
				platform: "github",
				repo: "test/repo",
			},
			summary: "Test",
			categories: [],
			links: {},
			confidence: 0.5,
			generatedFrom: ["test"],
		};

		const result = formatJson(minimalDoc);
		const parsed = JSON.parse(result);

		expect(parsed.version).toBeUndefined();
		expect(parsed.notes).toBeUndefined();
	});
});
