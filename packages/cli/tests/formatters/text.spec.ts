import type { WNFAggregatedDocument, WNFDocument } from "@whatsnew/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatText } from "../../src/formatters/text.js";

// Set NO_COLOR to disable ANSI codes in tests for easier assertions
beforeEach(() => {
	vi.stubEnv("NO_COLOR", "1");
});

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("formatText", () => {
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
						text: "Support streaming",
						refs: [],
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
				text: "See docs",
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
						items: [{ text: "Add streaming support", refs: ["#100"] }],
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
						items: [{ text: "Fix timeout issue", refs: [] }],
					},
				],
				releases: [],
				releaseCount: 2,
				latestVersion: "1.2.0",
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
		it("includes repo and version in header", () => {
			const result = formatText(mockDocument);

			expect(result).toContain("vercel/ai v4.0.0");
		});

		it("includes category titles", () => {
			const result = formatText(mockDocument);

			expect(result).toContain("Features");
			expect(result).toContain("Bug Fixes");
			expect(result).toContain("Breaking Changes");
		});

		it("includes change items", () => {
			const result = formatText(mockDocument);

			expect(result).toContain("Add new API endpoint");
			expect(result).toContain("Support streaming");
			expect(result).toContain("Fix memory leak");
		});

		it("includes refs in parentheses", () => {
			const result = formatText(mockDocument);

			expect(result).toContain("(#123)");
			expect(result).toContain("(#456)");
		});

		it("includes scope in brackets", () => {
			const result = formatText(mockDocument);

			expect(result).toContain("[api]");
		});

		it("includes notes section", () => {
			const result = formatText(mockDocument);

			expect(result).toContain("Notes");
			expect(result).toContain("Update your config file");
			expect(result).toContain("See docs");
		});

		it("includes confidence percentage in footer", () => {
			const result = formatText(mockDocument);

			expect(result).toContain("Confidence: 85%");
		});

		it("includes sources in footer", () => {
			const result = formatText(mockDocument);

			expect(result).toContain("Sources: github-release, changelog-file");
		});

		it("includes summary below box", () => {
			const result = formatText(mockDocument);

			expect(result).toContain("Summary:");
			expect(result).toContain("Major release with new features");
		});

		it("uses box drawing characters", () => {
			const result = formatText(mockDocument);

			expect(result).toContain("┌");
			expect(result).toContain("┐");
			expect(result).toContain("└");
			expect(result).toContain("┘");
			expect(result).toContain("│");
			expect(result).toContain("─");
		});
	});

	describe("aggregated document", () => {
		it("includes repo and release count in header", () => {
			const result = formatText(mockAggregatedDocument);

			expect(result).toContain("vercel/ai");
			expect(result).toContain("5 releases");
			expect(result).toContain("2 packages");
		});

		it("includes package names", () => {
			const result = formatText(mockAggregatedDocument);

			expect(result).toContain("ai");
			expect(result).toContain("@ai-sdk/anthropic");
		});

		it("marks main package", () => {
			const result = formatText(mockAggregatedDocument);

			expect(result).toContain("[main]");
		});

		it("includes version info per package", () => {
			const result = formatText(mockAggregatedDocument);

			expect(result).toContain("@ 4.0.0");
			expect(result).toContain("@ 1.2.0");
		});

		it("includes release count per package", () => {
			const result = formatText(mockAggregatedDocument);

			expect(result).toContain("(3 releases)");
			expect(result).toContain("(2 releases)");
		});

		it("includes changes per package", () => {
			const result = formatText(mockAggregatedDocument);

			expect(result).toContain("Add streaming support");
			expect(result).toContain("Fix timeout issue");
		});
	});

	describe("edge cases", () => {
		it("handles empty categories", () => {
			const docWithEmptyCategories: WNFDocument = {
				...mockDocument,
				categories: [],
			};

			const result = formatText(docWithEmptyCategories);

			expect(result).toContain("No changes found");
		});

		it("handles document without version", () => {
			const docWithoutVersion: WNFDocument = {
				...mockDocument,
				version: undefined,
			};

			const result = formatText(docWithoutVersion);

			expect(result).toContain("vercel/ai");
			expect(result).not.toContain("undefined");
		});

		it("handles document without summary", () => {
			const docWithoutSummary: WNFDocument = {
				...mockDocument,
				summary: "",
			};

			const result = formatText(docWithoutSummary);

			// Should not include Summary line when empty
			expect(result).not.toContain("Summary: \n");
		});

		it("handles items without refs", () => {
			const result = formatText(mockDocument);

			// "Support streaming" has no refs, shouldn't have empty parens
			const supportLine = result
				.split("\n")
				.find((l) => l.includes("Support streaming"));
			expect(supportLine).not.toContain("()");
		});

		it("handles empty packages in aggregated document", () => {
			const emptyPackagesDoc: WNFAggregatedDocument = {
				...mockAggregatedDocument,
				packages: [],
			};

			const result = formatText(emptyPackagesDoc);

			expect(result).toContain("No changes found");
		});

		it("handles package with no categories", () => {
			const packageWithNoCategories: WNFAggregatedDocument = {
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

			const result = formatText(packageWithNoCategories);

			expect(result).toContain("No changes parsed");
		});

		it("handles document without notes", () => {
			const docWithoutNotes: WNFDocument = {
				...mockDocument,
				notes: undefined,
			};

			const result = formatText(docWithoutNotes);

			expect(result).not.toContain("Notes");
		});

		it("handles empty notes array", () => {
			const docWithEmptyNotes: WNFDocument = {
				...mockDocument,
				notes: [],
			};

			const result = formatText(docWithEmptyNotes);

			expect(result).not.toContain("Notes");
		});
	});
});
