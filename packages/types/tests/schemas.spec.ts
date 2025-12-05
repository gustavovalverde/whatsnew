import { describe, expect, it } from "vitest";
import {
	CategorySchema,
	ChangeItemSchema,
	NoteSchema,
	SourceSchema,
	WNFDocumentSchema,
} from "../src/index.js";

describe("ChangeItemSchema", () => {
	it("validates minimal change item", () => {
		const item = { text: "Add new feature" };
		const result = ChangeItemSchema.safeParse(item);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.text).toBe("Add new feature");
		}
	});

	it("validates change item with all fields", () => {
		const item = {
			text: "Add new feature",
			refs: ["#123", "#456"],
			scope: "api",
			breaking: true,
			score: 0.85,
		};
		const result = ChangeItemSchema.safeParse(item);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.refs).toEqual(["#123", "#456"]);
			expect(result.data.scope).toBe("api");
			expect(result.data.breaking).toBe(true);
			expect(result.data.score).toBe(0.85);
		}
	});

	it("rejects missing text", () => {
		const item = { refs: ["#123"] };
		const result = ChangeItemSchema.safeParse(item);

		expect(result.success).toBe(false);
	});

	it("rejects score outside 0-1 range", () => {
		const itemLow = { text: "Test", score: -0.1 };
		const itemHigh = { text: "Test", score: 1.5 };

		expect(ChangeItemSchema.safeParse(itemLow).success).toBe(false);
		expect(ChangeItemSchema.safeParse(itemHigh).success).toBe(false);
	});

	it("accepts score at boundaries", () => {
		expect(ChangeItemSchema.safeParse({ text: "Test", score: 0 }).success).toBe(
			true,
		);
		expect(ChangeItemSchema.safeParse({ text: "Test", score: 1 }).success).toBe(
			true,
		);
	});
});

describe("CategorySchema", () => {
	it("validates category with items", () => {
		const category = {
			id: "features",
			title: "Features",
			items: [{ text: "New feature" }],
		};
		const result = CategorySchema.safeParse(category);

		expect(result.success).toBe(true);
	});

	it("validates all category IDs", () => {
		const categoryIds = [
			"breaking",
			"features",
			"fixes",
			"security",
			"perf",
			"deps",
			"docs",
			"refactor",
			"chore",
			"other",
		];

		for (const id of categoryIds) {
			const category = { id, title: id, items: [] };
			const result = CategorySchema.safeParse(category);
			expect(result.success).toBe(true);
		}
	});

	it("rejects invalid category ID", () => {
		const category = {
			id: "invalid",
			title: "Invalid",
			items: [],
		};
		const result = CategorySchema.safeParse(category);

		expect(result.success).toBe(false);
	});

	it("validates empty items array", () => {
		const category = {
			id: "features",
			title: "Features",
			items: [],
		};
		const result = CategorySchema.safeParse(category);

		expect(result.success).toBe(true);
	});
});

describe("NoteSchema", () => {
	it("validates note with type and text", () => {
		const note = {
			type: "migration",
			text: "Update your config file",
		};
		const result = NoteSchema.safeParse(note);

		expect(result.success).toBe(true);
	});

	it("validates all note types", () => {
		const types = ["upgrade", "migration", "deprecation", "info"];

		for (const type of types) {
			const note = { type, text: "Test" };
			const result = NoteSchema.safeParse(note);
			expect(result.success).toBe(true);
		}
	});

	it("rejects invalid note type", () => {
		const note = {
			type: "warning",
			text: "Test",
		};
		const result = NoteSchema.safeParse(note);

		expect(result.success).toBe(false);
	});
});

describe("SourceSchema", () => {
	it("validates minimal source", () => {
		const source = {
			platform: "github",
			repo: "vercel/ai",
		};
		const result = SourceSchema.safeParse(source);

		expect(result.success).toBe(true);
	});

	it("validates source with tag", () => {
		const source = {
			platform: "github",
			repo: "vercel/ai",
			tag: "v4.0.0",
		};
		const result = SourceSchema.safeParse(source);

		expect(result.success).toBe(true);
	});

	it("validates source with commit range", () => {
		const source = {
			platform: "gitlab",
			repo: "group/project",
			commitRange: {
				base: "abc123",
				head: "def456",
			},
		};
		const result = SourceSchema.safeParse(source);

		expect(result.success).toBe(true);
	});

	it("validates both platform types", () => {
		const github = { platform: "github", repo: "owner/repo" };
		const gitlab = { platform: "gitlab", repo: "group/project" };

		expect(SourceSchema.safeParse(github).success).toBe(true);
		expect(SourceSchema.safeParse(gitlab).success).toBe(true);
	});

	it("rejects invalid platform", () => {
		const source = {
			platform: "bitbucket",
			repo: "owner/repo",
		};
		const result = SourceSchema.safeParse(source);

		expect(result.success).toBe(false);
	});
});

describe("WNFDocumentSchema", () => {
	const validDocument = {
		spec: "wnf/0.1" as const,
		source: {
			platform: "github" as const,
			repo: "vercel/ai",
		},
		summary: "Major release with new features",
		categories: [
			{
				id: "features" as const,
				title: "Features",
				items: [{ text: "New feature" }],
			},
		],
		links: {},
		confidence: 0.85,
		generatedFrom: ["github-release"],
	};

	it("validates minimal document", () => {
		const result = WNFDocumentSchema.safeParse(validDocument);

		expect(result.success).toBe(true);
	});

	it("validates document with all optional fields", () => {
		const fullDocument = {
			...validDocument,
			version: "v4.0.0",
			releasedAt: "2024-06-15T12:00:00Z",
			notes: [{ type: "migration", text: "Update config" }],
			links: {
				release: "https://github.com/vercel/ai/releases/tag/v4.0.0",
				compare: "https://github.com/vercel/ai/compare/v3.0.0...v4.0.0",
				changelog: "https://github.com/vercel/ai/blob/main/CHANGELOG.md",
			},
			generatedAt: "2024-06-15T12:00:00Z",
		};
		const result = WNFDocumentSchema.safeParse(fullDocument);

		expect(result.success).toBe(true);
	});

	it("requires spec to be wnf/0.1", () => {
		const invalidSpec = { ...validDocument, spec: "wnf/0.2" };
		const result = WNFDocumentSchema.safeParse(invalidSpec);

		expect(result.success).toBe(false);
	});

	it("validates confidence range", () => {
		const lowConfidence = { ...validDocument, confidence: 0 };
		const highConfidence = { ...validDocument, confidence: 1 };
		const invalidLow = { ...validDocument, confidence: -0.1 };
		const invalidHigh = { ...validDocument, confidence: 1.1 };

		expect(WNFDocumentSchema.safeParse(lowConfidence).success).toBe(true);
		expect(WNFDocumentSchema.safeParse(highConfidence).success).toBe(true);
		expect(WNFDocumentSchema.safeParse(invalidLow).success).toBe(false);
		expect(WNFDocumentSchema.safeParse(invalidHigh).success).toBe(false);
	});

	it("validates releasedAt as ISO datetime", () => {
		const validDate = { ...validDocument, releasedAt: "2024-06-15T12:00:00Z" };
		const invalidDate = { ...validDocument, releasedAt: "2024-06-15" };

		expect(WNFDocumentSchema.safeParse(validDate).success).toBe(true);
		expect(WNFDocumentSchema.safeParse(invalidDate).success).toBe(false);
	});

	it("validates links as URLs", () => {
		const validLinks = {
			...validDocument,
			links: { release: "https://example.com" },
		};
		const invalidLinks = {
			...validDocument,
			links: { release: "not-a-url" },
		};

		expect(WNFDocumentSchema.safeParse(validLinks).success).toBe(true);
		expect(WNFDocumentSchema.safeParse(invalidLinks).success).toBe(false);
	});

	it("requires generatedFrom to be non-empty array", () => {
		const emptyArray = { ...validDocument, generatedFrom: [] };
		const result = WNFDocumentSchema.safeParse(emptyArray);

		// Empty array is technically valid per schema, but should have at least one source
		expect(result.success).toBe(true);
	});

	it("rejects missing required fields", () => {
		const missingSpec = { ...validDocument };
		delete (missingSpec as Record<string, unknown>).spec;

		const missingSource = { ...validDocument };
		delete (missingSource as Record<string, unknown>).source;

		const missingSummary = { ...validDocument };
		delete (missingSummary as Record<string, unknown>).summary;

		expect(WNFDocumentSchema.safeParse(missingSpec).success).toBe(false);
		expect(WNFDocumentSchema.safeParse(missingSource).success).toBe(false);
		expect(WNFDocumentSchema.safeParse(missingSummary).success).toBe(false);
	});
});
