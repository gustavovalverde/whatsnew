import type { Category, WNFDocument } from "@whatsnew/types";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/app/app.js";

const getLatestReleaseWNFMock =
	vi.fn<
		(owner: string, repo: string, packageName?: string) => Promise<WNFDocument>
	>();

const detectMonorepoMock =
	vi.fn<
		(
			owner: string,
			repo: string,
		) => Promise<{ isMonorepo: boolean; packages: string[] }>
	>();

const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {
	// Intentionally empty - suppress console.error in tests
});

vi.mock("@whatsnew/core", () => ({
	ReleaseService: class {
		getLatestReleaseWNF = getLatestReleaseWNFMock;
		detectMonorepo = detectMonorepoMock;
	},
}));

describe("release routes", () => {
	beforeEach(() => {
		getLatestReleaseWNFMock.mockReset();
		detectMonorepoMock.mockReset();
		// Default to non-monorepo
		detectMonorepoMock.mockResolvedValue({ isMonorepo: false, packages: [] });
	});

	afterAll(() => {
		consoleErrorSpy.mockRestore();
	});

	it("returns the latest release summary", async () => {
		const mockDocument: WNFDocument = {
			spec: "wnf/0.1",
			source: {
				platform: "github",
				repo: "test/repo",
				tag: "v2.0.0",
			},
			summary: "New major release",
			categories: [],
			links: {},
			confidence: 0.95,
			generatedFrom: ["github.release"],
			generatedAt: new Date().toISOString(),
		};

		getLatestReleaseWNFMock.mockResolvedValueOnce(mockDocument);

		const app = createApp();
		const response = await app.request(
			"/v1/repos/github/test/repo/releases/latest/whats-new",
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual(mockDocument);
	});

	it("returns an error payload when the service throws", async () => {
		getLatestReleaseWNFMock.mockRejectedValueOnce(new Error("boom"));

		const app = createApp();
		const response = await app.request(
			"/v1/repos/github/test/repo/releases/latest/whats-new",
		);

		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({
			error: "Failed to fetch release information",
		});
	});
});

describe("filter query parameter", () => {
	beforeEach(() => {
		getLatestReleaseWNFMock.mockReset();
		detectMonorepoMock.mockReset();
		detectMonorepoMock.mockResolvedValue({ isMonorepo: false, packages: [] });
	});

	afterAll(() => {
		consoleErrorSpy.mockRestore();
	});

	const mockDocumentWithCategories: WNFDocument = {
		spec: "wnf/0.1",
		source: {
			platform: "github",
			repo: "test/repo",
			tag: "v2.0.0",
		},
		summary: "New major release",
		categories: [
			{
				id: "breaking",
				title: "Breaking Changes",
				items: [{ text: "Removed deprecated API", refs: ["#100"] }],
			},
			{
				id: "features",
				title: "New Features",
				items: [{ text: "Added new feature", refs: ["#101"] }],
			},
			{
				id: "deps",
				title: "Dependencies",
				items: [
					{ text: "Bump Node.js to v20", refs: ["#102"], breaking: true },
					{ text: "Update lodash", refs: ["#103"] },
				],
			},
			{
				id: "chore",
				title: "Chores",
				items: [{ text: "Update CI workflow", refs: ["#104"] }],
			},
		],
		links: {},
		confidence: 0.95,
		generatedFrom: ["github.release"],
		generatedAt: new Date().toISOString(),
	};

	it("returns all categories when no filter is specified", async () => {
		getLatestReleaseWNFMock.mockResolvedValueOnce(mockDocumentWithCategories);

		const app = createApp();
		const response = await app.request(
			"/v1/repos/github/test/repo/releases/latest/whats-new",
		);

		expect(response.status).toBe(200);
		const data = (await response.json()) as WNFDocument;
		expect(data.categories).toHaveLength(4);
	});

	it("filters to important categories with ?filter=important", async () => {
		getLatestReleaseWNFMock.mockResolvedValueOnce(mockDocumentWithCategories);

		const app = createApp();
		const response = await app.request(
			"/v1/repos/github/test/repo/releases/latest/whats-new?filter=important",
		);

		expect(response.status).toBe(200);
		const data = (await response.json()) as WNFDocument;

		// Should include breaking, features, and deps (only breaking item)
		const categoryIds = data.categories.map((c: Category) => c.id);
		expect(categoryIds).toContain("breaking");
		expect(categoryIds).toContain("features");
		expect(categoryIds).toContain("deps"); // has breaking item
		expect(categoryIds).not.toContain("chore");

		// deps should only have the breaking item
		const deps = data.categories.find((c: Category) => c.id === "deps");
		expect(deps?.items).toHaveLength(1);
		expect(deps?.items[0].breaking).toBe(true);
	});

	it("filters to maintenance categories with ?filter=maintenance", async () => {
		getLatestReleaseWNFMock.mockResolvedValueOnce(mockDocumentWithCategories);

		const app = createApp();
		const response = await app.request(
			"/v1/repos/github/test/repo/releases/latest/whats-new?filter=maintenance",
		);

		expect(response.status).toBe(200);
		const data = (await response.json()) as WNFDocument;

		// Should include deps (non-breaking items only) and chore
		const categoryIds = data.categories.map((c: Category) => c.id);
		expect(categoryIds).not.toContain("breaking");
		expect(categoryIds).not.toContain("features");
		expect(categoryIds).toContain("deps");
		expect(categoryIds).toContain("chore");

		// deps should only have the non-breaking item
		const deps = data.categories.find((c: Category) => c.id === "deps");
		expect(deps?.items).toHaveLength(1);
		expect(deps?.items[0].breaking).toBeUndefined();
	});

	it("returns all categories with ?filter=all", async () => {
		getLatestReleaseWNFMock.mockResolvedValueOnce(mockDocumentWithCategories);

		const app = createApp();
		const response = await app.request(
			"/v1/repos/github/test/repo/releases/latest/whats-new?filter=all",
		);

		expect(response.status).toBe(200);
		const data = (await response.json()) as WNFDocument;
		expect(data.categories).toHaveLength(4);
	});

	it("returns 400 for invalid filter value", async () => {
		const app = createApp();
		const response = await app.request(
			"/v1/repos/github/test/repo/releases/latest/whats-new?filter=invalid",
		);

		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data).toEqual({
			error: "Invalid filter",
			message: "Invalid filter value: invalid",
			hint: "Valid values: important, maintenance, all",
		});
	});
});
