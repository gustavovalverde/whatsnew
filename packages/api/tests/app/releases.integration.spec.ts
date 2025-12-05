import type { WNFDocument } from "@whatsnew/types";
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
