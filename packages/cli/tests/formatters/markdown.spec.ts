import type { WNFAggregatedDocument, WNFDocument } from "@whatsnew/types";
import { describe, expect, it } from "vitest";
import { formatMarkdown } from "../../src/formatters/markdown.js";

describe("formatMarkdown", () => {
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
					{
						text: "Support streaming responses",
						refs: ["#124", "#125"],
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
					},
				],
			},
			{
				id: "breaking",
				title: "Breaking Changes",
				items: [
					{
						text: "Remove deprecated API",
						breaking: true,
					},
				],
			},
		],
		notes: [
			{
				type: "migration",
				text: "Update your config file",
			},
			{
				type: "info",
				text: "See documentation for details",
			},
		],
		links: {
			release: "https://github.com/vercel/ai/releases/tag/v4.0.0",
		},
		confidence: 0.85,
		generatedFrom: ["github-release", "changelog-file"],
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
		summary: "Multiple releases",
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
				releaseCount: 3,
				latestVersion: "4.0.0",
				confidence: 0.9,
			},
			{
				name: "@ai-sdk/anthropic",
				categories: [
					{
						id: "fixes",
						title: "Bug Fixes",
						items: [{ text: "Fix API timeout", refs: [] }],
					},
				],
				releases: [],
				releaseCount: 2,
				latestVersion: "1.0.0",
				confidence: 0.85,
			},
		],
		releases: [],
		releaseCount: 5,
		links: {
			releases: "https://github.com/vercel/ai/releases",
		},
		confidence: 0.87,
		generatedFrom: ["github-release"],
		generatedAt: "2024-06-15T12:00:00Z",
	};

	describe("single release document", () => {
		it("includes repo name and version in header", () => {
			const result = formatMarkdown(mockDocument);

			expect(result).toContain("# vercel/ai v4.0.0");
		});

		it("includes summary as blockquote", () => {
			const result = formatMarkdown(mockDocument);

			expect(result).toContain("> Major release with new features");
		});

		it("formats categories with h2 headings", () => {
			const result = formatMarkdown(mockDocument);

			expect(result).toContain("## Features");
			expect(result).toContain("## Bug Fixes");
			expect(result).toContain("## Breaking Changes");
		});

		it("formats items as bullet points", () => {
			const result = formatMarkdown(mockDocument);

			expect(result).toContain("- **[api]** Add new API endpoint (#123)");
			expect(result).toContain("- Support streaming responses (#124, #125)");
			expect(result).toContain("- Fix memory leak (#456)");
		});

		it("marks breaking changes with prefix", () => {
			const result = formatMarkdown(mockDocument);

			expect(result).toContain("- **BREAKING:** Remove deprecated API");
		});

		it("includes notes section", () => {
			const result = formatMarkdown(mockDocument);

			expect(result).toContain("## Notes");
			expect(result).toContain("- **Migration:** Update your config file");
			expect(result).toContain("- **info:** See documentation for details");
		});

		it("includes footer with confidence and sources", () => {
			const result = formatMarkdown(mockDocument);

			expect(result).toContain("---");
			expect(result).toContain("_Confidence: 85%");
			expect(result).toContain("Sources: github-release, changelog-file_");
		});
	});

	describe("aggregated document", () => {
		it("includes release count in header", () => {
			const result = formatMarkdown(mockAggregatedDocument);

			expect(result).toContain("# vercel/ai (5 releases, 2 packages)");
		});

		it("formats packages with h2 headings", () => {
			const result = formatMarkdown(mockAggregatedDocument);

			expect(result).toContain("## ai _(main)_ @ 4.0.0");
			expect(result).toContain("## @ai-sdk/anthropic @ 1.0.0");
		});

		it("includes release count per package", () => {
			const result = formatMarkdown(mockAggregatedDocument);

			expect(result).toContain("_3 releases_");
			expect(result).toContain("_2 releases_");
		});

		it("formats categories under packages with h3 headings", () => {
			const result = formatMarkdown(mockAggregatedDocument);

			expect(result).toContain("### Features");
			expect(result).toContain("### Bug Fixes");
		});
	});

	describe("edge cases", () => {
		it("handles empty categories", () => {
			const docWithEmptyCategories: WNFDocument = {
				...mockDocument,
				categories: [],
			};

			const result = formatMarkdown(docWithEmptyCategories);

			expect(result).toContain("_No changes found_");
		});

		it("handles document without version", () => {
			const docWithoutVersion: WNFDocument = {
				...mockDocument,
				version: undefined,
			};

			const result = formatMarkdown(docWithoutVersion);

			expect(result).toContain("# vercel/ai");
			expect(result).not.toContain("undefined");
		});

		it("handles items without refs", () => {
			const docWithNoRefs: WNFDocument = {
				...mockDocument,
				categories: [
					{
						id: "features",
						title: "Features",
						items: [{ text: "Simple feature" }],
					},
				],
			};

			const result = formatMarkdown(docWithNoRefs);

			expect(result).toContain("- Simple feature");
			expect(result).not.toContain("()");
		});

		it("handles items without scope", () => {
			const result = formatMarkdown(mockDocument);

			// Item without scope should not have brackets
			expect(result).toContain("- Support streaming responses");
		});

		it("handles empty packages in aggregated document", () => {
			const emptyPackagesDoc: WNFAggregatedDocument = {
				...mockAggregatedDocument,
				packages: [],
			};

			const result = formatMarkdown(emptyPackagesDoc);

			expect(result).toContain("_No changes found_");
		});

		it("handles package with no changes parsed", () => {
			const packageWithNoChanges: WNFAggregatedDocument = {
				...mockAggregatedDocument,
				packages: [
					{
						name: "empty-pkg",
						categories: [],
						releases: [],
						releaseCount: 1,
						confidence: 0.5,
					},
				],
			};

			const result = formatMarkdown(packageWithNoChanges);

			expect(result).toContain("_No changes parsed_");
		});

		it("handles document without summary", () => {
			const docWithoutSummary: WNFDocument = {
				...mockDocument,
				summary: "",
			};

			const result = formatMarkdown(docWithoutSummary);

			expect(result).not.toContain("> ");
		});
	});
});
