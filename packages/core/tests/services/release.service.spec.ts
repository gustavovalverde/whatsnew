import type { GitHubRelease } from "@whatsnew/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReleaseService } from "../../src/services/release.service.js";

const getLatestReleaseMock = vi.fn<
	[owner: string, repo: string],
	Promise<GitHubRelease>
>();

const getRecentReleasesMock = vi.fn<
	[
		owner: string,
		repo: string,
		options: { perPage?: number; packageFilter?: string },
	],
	Promise<GitHubRelease[]>
>();

const detectMonorepoMock = vi.fn<
	[owner: string, repo: string],
	Promise<{ isMonorepo: boolean; packages: string[] }>
>();

vi.mock("../../src/integrations/github-client.js", () => ({
	GitHubClient: class {
		getLatestRelease = getLatestReleaseMock;
		getRecentReleases = getRecentReleasesMock;
		detectMonorepo = detectMonorepoMock;
	},
}));

describe("ReleaseService", () => {
	beforeEach(() => {
		getLatestReleaseMock.mockReset();
		getRecentReleasesMock.mockReset();
		detectMonorepoMock.mockReset();
	});

	it("builds a WNF document from the latest GitHub release", async () => {
		const release: GitHubRelease = {
			id: 1,
			tag_name: "v1.2.0",
			name: "v1.2.0",
			body: `New Features\n\n## Features\n- add Bun 1.3 support\n\n## Fixes\n- resolve parser crash\n`,
			published_at: "2025-10-20T10:00:00Z",
			html_url: "https://github.com/test/test/releases/tag/v1.2.0",
			draft: false,
			prerelease: false,
		};
		getLatestReleaseMock.mockResolvedValueOnce(release);

		// Use enableFallback: false to test single-source behavior (GitHub releases only)
		const service = new ReleaseService({ enableFallback: false });
		const document = await service.getLatestReleaseWNF("test", "repo");

		expect(getLatestReleaseMock).toHaveBeenCalledWith("test", "repo");
		expect(document.version).toBe("1.2.0");
		expect(document.summary).toBe("New Features");
		expect(document.categories).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: "features",
					title: "New Features",
					items: [
						expect.objectContaining({ text: "add Bun 1.3 support", refs: [] }),
					],
				}),
				expect.objectContaining({
					id: "fixes",
					title: "Bug Fixes",
					items: [
						expect.objectContaining({ text: "resolve parser crash", refs: [] }),
					],
				}),
			]),
		);
	});

	it("returns empty categories when release body has no recognised sections", async () => {
		const release: GitHubRelease = {
			id: 2,
			tag_name: "v1.0.1",
			name: "v1.0.1",
			body: "Maintenance release",
			published_at: "2025-09-01T00:00:00Z",
			html_url: "https://github.com/test/test/releases/tag/v1.0.1",
			draft: false,
			prerelease: false,
		};
		getLatestReleaseMock.mockResolvedValueOnce(release);

		const service = new ReleaseService({ enableFallback: false });
		const document = await service.getLatestReleaseWNF("test", "repo");

		expect(document.categories).toEqual([]);
	});

	describe("Keep-a-Changelog format integration", () => {
		it("should parse Keep-a-Changelog formatted releases", async () => {
			const release: GitHubRelease = {
				id: 3,
				tag_name: "v2.0.0",
				name: "v2.0.0",
				body: `## [2.0.0] - 2024-01-15

### Added
- New authentication system
- Support for OAuth providers

### Changed
- Updated API endpoint structure

### Fixed
- Memory leak in cache manager
- Race condition in concurrent requests`,
				published_at: "2024-01-15T10:00:00Z",
				html_url: "https://github.com/test/test/releases/tag/v2.0.0",
				draft: false,
				prerelease: false,
			};
			getLatestReleaseMock.mockResolvedValueOnce(release);

			const service = new ReleaseService({ enableFallback: false });
			const document = await service.getLatestReleaseWNF("test", "repo");

			expect(document.version).toBe("2.0.0");
			// Should parse and categorize the changes
			expect(document.categories.length).toBeGreaterThan(0);

			// Check that features category exists with items
			const featuresCategory = document.categories.find(
				(c) => c.id === "features",
			);
			if (featuresCategory) {
				expect(featuresCategory.items.length).toBeGreaterThan(0);
			}
		});

		it("should handle Keep-a-Changelog with only Added and Fixed sections", async () => {
			const release: GitHubRelease = {
				id: 4,
				tag_name: "v1.5.0",
				name: "v1.5.0",
				body: `## [1.5.0] - 2024-02-01

### Added
- Dark mode support

### Fixed
- Button alignment issue`,
				published_at: "2024-02-01T10:00:00Z",
				html_url: "https://github.com/test/test/releases/tag/v1.5.0",
				draft: false,
				prerelease: false,
			};
			getLatestReleaseMock.mockResolvedValueOnce(release);

			const service = new ReleaseService({ enableFallback: false });
			const document = await service.getLatestReleaseWNF("test", "repo");

			// Should parse and return categories
			expect(document.categories.length).toBeGreaterThan(0);
		});
	});

	describe("Conventional Commits format integration", () => {
		it("should detect and parse release notes with conventional commit style", async () => {
			const release: GitHubRelease = {
				id: 5,
				tag_name: "v3.0.0",
				name: "v3.0.0",
				body: `## Features
feat(auth): add OAuth2 support
feat(api): implement rate limiting middleware

## Fixes
fix(parser): resolve edge case in date parsing
fix(ui): correct button styling on mobile`,
				published_at: "2024-03-01T10:00:00Z",
				html_url: "https://github.com/test/test/releases/tag/v3.0.0",
				draft: false,
				prerelease: false,
			};
			getLatestReleaseMock.mockResolvedValueOnce(release);

			const service = new ReleaseService({ enableFallback: false });
			const document = await service.getLatestReleaseWNF("test", "repo");

			expect(document.version).toBe("3.0.0");
			// Should parse using generic parser and find the sections
			expect(document.categories.length).toBeGreaterThan(0);
		});
	});

	describe("Changesets format integration", () => {
		it("should parse Changesets formatted releases", async () => {
			const release: GitHubRelease = {
				id: 7,
				tag_name: "@myorg/api@1.0.0",
				name: "@myorg/api@1.0.0",
				body: `### Major Changes

- abc123: Complete API redesign with breaking changes

### Minor Changes

- def456: Add webhook support
- ghi789: Improve error messages

### Patch Changes

- jkl012: Fix memory leak in connection pool`,
				published_at: "2024-04-01T10:00:00Z",
				html_url: "https://github.com/test/test/releases/tag/@myorg/api@1.0.0",
				draft: false,
				prerelease: false,
			};
			getLatestReleaseMock.mockResolvedValueOnce(release);

			const service = new ReleaseService({ enableFallback: false });
			const document = await service.getLatestReleaseWNF("test", "repo");

			expect(document.version).toBe("1.0.0");
			expect(document.categories.length).toBeGreaterThan(0);

			const breakingCategory = document.categories.find(
				(c) => c.id === "breaking",
			);
			expect(breakingCategory).toBeDefined();

			const featuresCategory = document.categories.find(
				(c) => c.id === "features",
			);
			expect(featuresCategory).toBeDefined();

			const fixesCategory = document.categories.find((c) => c.id === "fixes");
			expect(fixesCategory).toBeDefined();
		});
	});

	describe("Generic format with custom headers", () => {
		it("should parse release notes with various custom section headers", async () => {
			const release: GitHubRelease = {
				id: 8,
				tag_name: "v4.0.0",
				name: "v4.0.0",
				body: `## Highlights
- Major performance improvements
- New caching layer

## Enhancements
- Better error messages
- Improved logging

## Bug Fixes
- Fixed race condition in worker pool
- Resolved memory leak (#123)

## Internal
- Updated dependencies
- Refactored core module`,
				published_at: "2024-05-01T10:00:00Z",
				html_url: "https://github.com/test/test/releases/tag/v4.0.0",
				draft: false,
				prerelease: false,
			};
			getLatestReleaseMock.mockResolvedValueOnce(release);

			const service = new ReleaseService({ enableFallback: false });
			const document = await service.getLatestReleaseWNF("test", "repo");

			expect(document.version).toBe("4.0.0");
			// Should have parsed multiple categories
			expect(document.categories.length).toBeGreaterThan(0);

			// Highlights should be mapped to features
			const featuresCategory = document.categories.find(
				(c) => c.id === "features",
			);
			expect(featuresCategory).toBeDefined();
			expect(featuresCategory?.items.length).toBeGreaterThan(0);

			// Bug Fixes should be mapped to fixes
			const fixesCategory = document.categories.find((c) => c.id === "fixes");
			expect(fixesCategory).toBeDefined();
			expect(fixesCategory?.items.length).toBeGreaterThan(0);

			// Check that refs are extracted
			const fixWithRef = fixesCategory?.items.find((item) =>
				item.text.includes("#123"),
			);
			expect(fixWithRef?.refs).toContain("123");
		});

		it("should parse release notes with emoji headers", async () => {
			const release: GitHubRelease = {
				id: 9,
				tag_name: "v5.0.0",
				name: "v5.0.0",
				body: `## 🚀 Features
- New authentication system
- Added WebSocket support

## 🐛 Bug Fixes
- Fixed login timeout
- Resolved caching issue`,
				published_at: "2024-06-01T10:00:00Z",
				html_url: "https://github.com/test/test/releases/tag/v5.0.0",
				draft: false,
				prerelease: false,
			};
			getLatestReleaseMock.mockResolvedValueOnce(release);

			const service = new ReleaseService({ enableFallback: false });
			const document = await service.getLatestReleaseWNF("test", "repo");

			expect(document.categories.length).toBeGreaterThan(0);

			const featuresCategory = document.categories.find(
				(c) => c.id === "features",
			);
			expect(featuresCategory).toBeDefined();
			expect(featuresCategory?.items).toHaveLength(2);

			const fixesCategory = document.categories.find((c) => c.id === "fixes");
			expect(fixesCategory).toBeDefined();
			expect(fixesCategory?.items).toHaveLength(2);
		});

		it("should extract bullet points when no headers are present", async () => {
			const release: GitHubRelease = {
				id: 10,
				tag_name: "v6.0.0",
				name: "v6.0.0",
				body: `Quick patch release:

- Fixed critical bug in authentication
- Updated security dependencies
- Improved error handling`,
				published_at: "2024-07-01T10:00:00Z",
				html_url: "https://github.com/test/test/releases/tag/v6.0.0",
				draft: false,
				prerelease: false,
			};
			getLatestReleaseMock.mockResolvedValueOnce(release);

			const service = new ReleaseService({ enableFallback: false });
			const document = await service.getLatestReleaseWNF("test", "repo");

			// Should have at least one category with the bullet points
			expect(document.categories.length).toBeGreaterThan(0);

			// With universal categorization, items are distributed by text analysis:
			// - "Fixed critical bug" → fixes (keyword: "fixed")
			// - "Updated security dependencies" → security (keyword: "security")
			// - "Improved error handling" → fixes (keyword: "handle")
			const fixesCategory = document.categories.find((c) => c.id === "fixes");
			expect(fixesCategory).toBeDefined();
			expect(fixesCategory?.items.length).toBeGreaterThanOrEqual(1);

			const securityCategory = document.categories.find(
				(c) => c.id === "security",
			);
			expect(securityCategory).toBeDefined();
		});

		it("should categorize items by text analysis regardless of section header", async () => {
			const release: GitHubRelease = {
				id: 11,
				tag_name: "v7.0.0",
				name: "v7.0.0",
				body: `## Changelog
- Updated configuration options
- Improved documentation
- Minor refactoring`,
				published_at: "2024-08-01T10:00:00Z",
				html_url: "https://github.com/test/test/releases/tag/v7.0.0",
				draft: false,
				prerelease: false,
			};
			getLatestReleaseMock.mockResolvedValueOnce(release);

			const service = new ReleaseService({ enableFallback: false });
			const document = await service.getLatestReleaseWNF("test", "repo");

			expect(document.categories.length).toBeGreaterThan(0);

			// With universal categorization, items are distributed by text analysis:
			// - "Updated configuration options" → other (no strong keyword match)
			// - "Improved documentation" → docs (keyword: "documentation")
			// - "Minor refactoring" → other (source hint fallback, "refactoring" != "refactor")
			const docsCategory = document.categories.find((c) => c.id === "docs");
			expect(docsCategory).toBeDefined();
			expect(docsCategory?.items).toHaveLength(1);

			const otherCategory = document.categories.find((c) => c.id === "other");
			expect(otherCategory).toBeDefined();
			expect(otherCategory?.items).toHaveLength(2);
		});
	});
});
