import { describe, expect, it } from "vitest";
import {
	analyzeKeywords,
	categorizeItems,
	inferItemCategory,
	mapSectionToCategory,
	normalizeSectionName,
} from "../src/categorizer/index.js";

describe("analyzeKeywords", () => {
	describe("fixes category", () => {
		it("matches 'fix' keyword", () => {
			const result = analyzeKeywords("Fix the login issue");
			expect(result.category).toBe("fixes");
			expect(result.score).toBeGreaterThanOrEqual(1);
		});

		it("matches 'fixes' keyword (plural noun)", () => {
			const result = analyzeKeywords(
				"Bring React Server Component fixes to Server Actions",
			);
			expect(result.category).toBe("fixes");
			expect(result.score).toBeGreaterThanOrEqual(1);
		});

		it("matches 'fixed' keyword", () => {
			const result = analyzeKeywords("Fixed memory leak in connection pool");
			expect(result.category).toBe("fixes");
			expect(result.score).toBeGreaterThanOrEqual(1);
		});

		it("matches 'bug' keyword", () => {
			const result = analyzeKeywords("Resolve bug in authentication");
			expect(result.category).toBe("fixes");
			expect(result.score).toBeGreaterThanOrEqual(1);
		});
	});

	describe("features category", () => {
		it("matches 'add' keyword", () => {
			const result = analyzeKeywords("Add new authentication endpoint");
			expect(result.category).toBe("features");
			expect(result.score).toBeGreaterThanOrEqual(1);
		});

		it("matches 'allow' keyword", () => {
			const result = analyzeKeywords(
				"Allow building single release channel with processed versions",
			);
			expect(result.category).toBe("features");
			expect(result.score).toBeGreaterThanOrEqual(1);
		});
	});

	describe("no match returns other with zero score", () => {
		it("returns other for unrecognized text", () => {
			const result = analyzeKeywords("Some random changelog entry");
			expect(result.category).toBe("other");
			expect(result.score).toBe(0);
		});
	});
});

describe("inferItemCategory", () => {
	it("categorizes items with fixes keyword", () => {
		const result = inferItemCategory({
			text: "Bring ReactFlightClient fixes to FlightReplyServer",
			refs: [],
		});
		expect(result.categoryId).toBe("fixes");
		expect(result.reason).toBe("keyword_match");
	});

	it("prioritizes conventional commit type over keywords", () => {
		const result = inferItemCategory({
			text: "Some text with fixes word",
			refs: [],
			conventionalType: "feat",
		});
		expect(result.categoryId).toBe("features");
		expect(result.reason).toBe("conventional_commit");
	});

	it("uses explicit breaking flag with highest priority", () => {
		const result = inferItemCategory({
			text: "Add new feature",
			refs: [],
			breaking: true,
		});
		expect(result.categoryId).toBe("breaking");
		expect(result.reason).toBe("explicit_breaking");
	});
});

describe("categorizeItems", () => {
	it("categorizes items with fixes in text correctly", () => {
		const items = [
			{
				text: "Bring React Server Component fixes to Server Actions",
				refs: ["35277"],
			},
			{
				text: "Allow building single release channel",
				refs: ["35270"],
			},
		];

		const categories = categorizeItems(items);

		const fixes = categories.find((c) => c.id === "fixes");
		const features = categories.find((c) => c.id === "features");

		expect(fixes).toBeDefined();
		expect(fixes?.items).toHaveLength(1);
		expect(fixes?.items[0].text).toContain("fixes");

		expect(features).toBeDefined();
		expect(features?.items).toHaveLength(1);
	});
});

describe("normalizeSectionName", () => {
	it("converts to lowercase", () => {
		expect(normalizeSectionName("Bug Fixes")).toBe("bug fixes");
	});

	it("strips emojis", () => {
		expect(normalizeSectionName("🚀 Features")).toBe("features");
		expect(normalizeSectionName("🐛 Bug Fixes")).toBe("bug fixes");
	});

	it("trims whitespace", () => {
		expect(normalizeSectionName("  Features  ")).toBe("features");
	});
});

describe("mapSectionToCategory", () => {
	it("maps standard bug fix variations to fixes", () => {
		expect(mapSectionToCategory("Bug fixes")).toBe("fixes");
		expect(mapSectionToCategory("Bug Fix")).toBe("fixes");
		expect(mapSectionToCategory("Bugfixes")).toBe("fixes");
		expect(mapSectionToCategory("Fixed")).toBe("fixes");
		expect(mapSectionToCategory("Fixes")).toBe("fixes");
	});

	it("maps feature variations to features", () => {
		expect(mapSectionToCategory("Features")).toBe("features");
		expect(mapSectionToCategory("New Features")).toBe("features");
		expect(mapSectionToCategory("Enhancements")).toBe("features");
		expect(mapSectionToCategory("Added")).toBe("features");
	});

	it("maps breaking change sections to breaking", () => {
		expect(mapSectionToCategory("Breaking Changes")).toBe("breaking");
		expect(mapSectionToCategory("Breaking")).toBe("breaking");
		expect(mapSectionToCategory("Removed")).toBe("breaking");
	});

	it("maps documentation sections to docs", () => {
		expect(mapSectionToCategory("Documentation")).toBe("docs");
		expect(mapSectionToCategory("Docs")).toBe("docs");
	});

	it("maps dependency sections to deps", () => {
		expect(mapSectionToCategory("Dependencies")).toBe("deps");
		expect(mapSectionToCategory("Dependency Updates")).toBe("deps");
	});

	it("handles emoji prefixes", () => {
		expect(mapSectionToCategory("🚀 Features")).toBe("features");
		expect(mapSectionToCategory("🐛 Bug Fixes")).toBe("fixes");
		expect(mapSectionToCategory("📚 Documentation")).toBe("docs");
	});

	it("returns other for unrecognized sections", () => {
		expect(mapSectionToCategory("Random Section")).toBe("other");
		expect(mapSectionToCategory("Thanks")).toBe("other");
		expect(mapSectionToCategory("Contributors")).toBe("other");
	});

	it("handles Other Changes variations", () => {
		expect(mapSectionToCategory("Other")).toBe("other");
		expect(mapSectionToCategory("Other Changes")).toBe("other");
		expect(mapSectionToCategory("Miscellaneous")).toBe("other");
	});
});
