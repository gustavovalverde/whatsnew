import type { GitHubRelease } from "@whatsnew/types";
import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_FETCH = global.fetch;

/**
 * Create a mock response with proper headers for rate limit checking
 */
function createMockResponse<T>(
	data: T,
	options: { ok?: boolean; status?: number; statusText?: string } = {},
) {
	const { ok = true, status = 200, statusText = "OK" } = options;
	return {
		ok,
		status,
		statusText,
		headers: {
			get: (name: string) => {
				const headers: Record<string, string> = {
					"X-RateLimit-Limit": "5000",
					"X-RateLimit-Remaining": "4999",
					"X-RateLimit-Reset": String(Math.floor(Date.now() / 1000) + 3600),
				};
				return headers[name] || null;
			},
		},
		json: () => Promise.resolve(data),
	};
}

describe("GitHubClient", () => {
	afterEach(() => {
		global.fetch = ORIGINAL_FETCH;
		vi.restoreAllMocks();
	});

	it("calls the GitHub API with authentication when token is set", async () => {
		const mockRelease = {
			id: 1,
			tag_name: "v1.0.0",
			name: "v1.0.0",
			body: "First release",
			published_at: "2025-01-01T00:00:00Z",
			html_url: "https://github.com/test/test/releases/tag/v1.0.0",
			draft: false,
			prerelease: false,
		} satisfies GitHubRelease;
		const fetchMock = vi
			.fn()
			.mockResolvedValue(createMockResponse(mockRelease));
		global.fetch = fetchMock;

		const { GitHubClient } = await import(
			"../../src/integrations/github-client.js"
		);
		const client = new GitHubClient({ token: "token123" });
		const release = await client.getLatestRelease("test", "repo");

		expect(release).toEqual(mockRelease);
		expect(fetchMock).toHaveBeenCalledWith(
			"https://api.github.com/repos/test/repo/releases/latest",
			expect.objectContaining({
				headers: expect.objectContaining({
					Authorization: "Bearer token123",
				}),
			}),
		);
	});

	it("throws when the response is not ok", async () => {
		global.fetch = vi.fn().mockResolvedValue(
			createMockResponse(null, {
				ok: false,
				status: 404,
				statusText: "Not Found",
			}),
		);

		const { GitHubClient } = await import(
			"../../src/integrations/github-client.js"
		);
		const client = new GitHubClient();

		await expect(client.getLatestRelease("nope", "nope")).rejects.toThrowError(
			"GitHub API error: 404 Not Found",
		);
	});

	describe("monorepo detection", () => {
		it("should detect monorepo when multiple package names exist", async () => {
			const mockReleases = [
				{
					id: 1,
					tag_name: "@scope/pkg-a@1.0.0",
					name: "@scope/pkg-a@1.0.0",
					body: "Release A",
					published_at: "2025-01-01T00:00:00Z",
					html_url:
						"https://github.com/test/test/releases/tag/@scope/pkg-a@1.0.0",
					draft: false,
					prerelease: false,
				},
				{
					id: 2,
					tag_name: "@scope/pkg-b@1.0.0",
					name: "@scope/pkg-b@1.0.0",
					body: "Release B",
					published_at: "2025-01-02T00:00:00Z",
					html_url:
						"https://github.com/test/test/releases/tag/@scope/pkg-b@1.0.0",
					draft: false,
					prerelease: false,
				},
			] satisfies GitHubRelease[];

			const fetchMock = vi
				.fn()
				.mockResolvedValue(createMockResponse(mockReleases));
			global.fetch = fetchMock;

			const { GitHubClient } = await import(
				"../../src/integrations/github-client.js"
			);
			const client = new GitHubClient();
			const result = await client.detectMonorepo("test", "repo");

			expect(result.isMonorepo).toBe(true);
			expect(result.packages).toEqual(["@scope/pkg-a", "@scope/pkg-b"]);
		});

		it("should detect non-monorepo when only one package exists", async () => {
			const mockReleases = [
				{
					id: 1,
					tag_name: "v1.0.0",
					name: "v1.0.0",
					body: "Release 1",
					published_at: "2025-01-01T00:00:00Z",
					html_url: "https://github.com/test/test/releases/tag/v1.0.0",
					draft: false,
					prerelease: false,
				},
				{
					id: 2,
					tag_name: "v1.1.0",
					name: "v1.1.0",
					body: "Release 2",
					published_at: "2025-01-02T00:00:00Z",
					html_url: "https://github.com/test/test/releases/tag/v1.1.0",
					draft: false,
					prerelease: false,
				},
			] satisfies GitHubRelease[];

			const fetchMock = vi
				.fn()
				.mockResolvedValue(createMockResponse(mockReleases));
			global.fetch = fetchMock;

			const { GitHubClient } = await import(
				"../../src/integrations/github-client.js"
			);
			const client = new GitHubClient();
			const result = await client.detectMonorepo("test", "repo");

			expect(result.isMonorepo).toBe(false);
			expect(result.packages).toEqual([]);
		});

		it("should handle mixed package formats in monorepo", async () => {
			const mockReleases = [
				{
					id: 1,
					tag_name: "pkg-a@1.0.0",
					name: "pkg-a@1.0.0",
					body: "Release A",
					published_at: "2025-01-01T00:00:00Z",
					html_url: "https://github.com/test/test/releases/tag/pkg-a@1.0.0",
					draft: false,
					prerelease: false,
				},
				{
					id: 2,
					tag_name: "@scope/pkg-b@2.0.0",
					name: "@scope/pkg-b@2.0.0",
					body: "Release B",
					published_at: "2025-01-02T00:00:00Z",
					html_url:
						"https://github.com/test/test/releases/tag/@scope/pkg-b@2.0.0",
					draft: false,
					prerelease: false,
				},
			] satisfies GitHubRelease[];

			const fetchMock = vi
				.fn()
				.mockResolvedValue(createMockResponse(mockReleases));
			global.fetch = fetchMock;

			const { GitHubClient } = await import(
				"../../src/integrations/github-client.js"
			);
			const client = new GitHubClient();
			const result = await client.detectMonorepo("test", "repo");

			expect(result.isMonorepo).toBe(true);
			expect(result.packages).toEqual(["@scope/pkg-b", "pkg-a"]);
		});
	});

	describe("getRecentReleases with package filtering", () => {
		it("should filter releases by package name", async () => {
			const mockReleases = [
				{
					id: 1,
					tag_name: "@scope/pkg-a@1.0.0",
					name: "@scope/pkg-a@1.0.0",
					body: "Release A v1",
					published_at: "2025-01-01T00:00:00Z",
					html_url:
						"https://github.com/test/test/releases/tag/@scope/pkg-a@1.0.0",
					draft: false,
					prerelease: false,
				},
				{
					id: 2,
					tag_name: "@scope/pkg-b@1.0.0",
					name: "@scope/pkg-b@1.0.0",
					body: "Release B v1",
					published_at: "2025-01-02T00:00:00Z",
					html_url:
						"https://github.com/test/test/releases/tag/@scope/pkg-b@1.0.0",
					draft: false,
					prerelease: false,
				},
				{
					id: 3,
					tag_name: "@scope/pkg-a@1.1.0",
					name: "@scope/pkg-a@1.1.0",
					body: "Release A v1.1",
					published_at: "2025-01-03T00:00:00Z",
					html_url:
						"https://github.com/test/test/releases/tag/@scope/pkg-a@1.1.0",
					draft: false,
					prerelease: false,
				},
			] satisfies GitHubRelease[];

			const fetchMock = vi
				.fn()
				.mockResolvedValue(createMockResponse(mockReleases));
			global.fetch = fetchMock;

			const { GitHubClient } = await import(
				"../../src/integrations/github-client.js"
			);
			const client = new GitHubClient();
			const result = await client.getRecentReleases("test", "repo", {
				packageFilter: "@scope/pkg-a",
			});

			expect(result).toHaveLength(2);
			expect(result[0].tag_name).toBe("@scope/pkg-a@1.0.0");
			expect(result[1].tag_name).toBe("@scope/pkg-a@1.1.0");
		});

		it("should return all releases when no package filter provided", async () => {
			const mockReleases = [
				{
					id: 1,
					tag_name: "@scope/pkg-a@1.0.0",
					name: "@scope/pkg-a@1.0.0",
					body: "Release A",
					published_at: "2025-01-01T00:00:00Z",
					html_url:
						"https://github.com/test/test/releases/tag/@scope/pkg-a@1.0.0",
					draft: false,
					prerelease: false,
				},
				{
					id: 2,
					tag_name: "@scope/pkg-b@1.0.0",
					name: "@scope/pkg-b@1.0.0",
					body: "Release B",
					published_at: "2025-01-02T00:00:00Z",
					html_url:
						"https://github.com/test/test/releases/tag/@scope/pkg-b@1.0.0",
					draft: false,
					prerelease: false,
				},
			] satisfies GitHubRelease[];

			const fetchMock = vi
				.fn()
				.mockResolvedValue(createMockResponse(mockReleases));
			global.fetch = fetchMock;

			const { GitHubClient } = await import(
				"../../src/integrations/github-client.js"
			);
			const client = new GitHubClient();
			const result = await client.getRecentReleases("test", "repo");

			expect(result).toHaveLength(2);
		});

		it("should return empty array when package filter matches nothing", async () => {
			const mockReleases = [
				{
					id: 1,
					tag_name: "@scope/pkg-a@1.0.0",
					name: "@scope/pkg-a@1.0.0",
					body: "Release A",
					published_at: "2025-01-01T00:00:00Z",
					html_url:
						"https://github.com/test/test/releases/tag/@scope/pkg-a@1.0.0",
					draft: false,
					prerelease: false,
				},
			] satisfies GitHubRelease[];

			const fetchMock = vi
				.fn()
				.mockResolvedValue(createMockResponse(mockReleases));
			global.fetch = fetchMock;

			const { GitHubClient } = await import(
				"../../src/integrations/github-client.js"
			);
			const client = new GitHubClient();
			const result = await client.getRecentReleases("test", "repo", {
				packageFilter: "@scope/pkg-nonexistent",
			});

			expect(result).toHaveLength(0);
		});
	});
});
