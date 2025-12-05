import { describe, expect, it } from "vitest";
import {
	PackageAggregator,
	type ParsedRelease,
} from "../../../src/services/range/package-aggregator.js";

describe("PackageAggregator", () => {
	const createRelease = (
		tag: string,
		categories: ParsedRelease["categories"] = [],
		confidence = 0.8,
	): ParsedRelease => ({
		tag_name: tag,
		published_at: "2024-06-15T00:00:00Z",
		html_url: `https://github.com/owner/repo/releases/tag/${tag}`,
		categories,
		confidence,
	});

	describe("aggregate", () => {
		it("groups releases by package name from scoped tags", () => {
			const aggregator = new PackageAggregator("repo");
			const releases = [
				createRelease("@scope/pkg-a@1.0.0"),
				createRelease("@scope/pkg-a@1.1.0"),
				createRelease("@scope/pkg-b@2.0.0"),
			];

			const result = aggregator.aggregate(releases);

			expect(result.packages).toHaveLength(2);
			expect(result.packages.map((p) => p.name)).toContain("@scope/pkg-a");
			expect(result.packages.map((p) => p.name)).toContain("@scope/pkg-b");
		});

		it("uses repo name for simple version tags", () => {
			const aggregator = new PackageAggregator("my-repo");
			const releases = [createRelease("v1.0.0"), createRelease("v1.1.0")];

			const result = aggregator.aggregate(releases);

			expect(result.packages).toHaveLength(1);
			expect(result.packages[0].name).toBe("my-repo");
		});

		it("tracks release count per package", () => {
			const aggregator = new PackageAggregator("repo");
			const releases = [
				createRelease("@pkg/a@1.0.0"),
				createRelease("@pkg/a@1.1.0"),
				createRelease("@pkg/a@1.2.0"),
				createRelease("@pkg/b@1.0.0"),
			];

			const result = aggregator.aggregate(releases);

			const pkgA = result.packages.find((p) => p.name === "@pkg/a");
			const pkgB = result.packages.find((p) => p.name === "@pkg/b");

			expect(pkgA?.releaseCount).toBe(3);
			expect(pkgB?.releaseCount).toBe(1);
		});

		it("calculates average confidence per package", () => {
			const aggregator = new PackageAggregator("repo");
			const releases = [
				createRelease("@pkg/a@1.0.0", [], 0.6),
				createRelease("@pkg/a@1.1.0", [], 0.8),
			];

			const result = aggregator.aggregate(releases);

			expect(result.packages[0].confidence).toBe(0.7);
		});

		it("sets latest version from first release in group", () => {
			const aggregator = new PackageAggregator("repo");
			const releases = [
				createRelease("@pkg/a@2.0.0"),
				createRelease("@pkg/a@1.0.0"),
			];

			const result = aggregator.aggregate(releases);

			expect(result.packages[0].latestVersion).toBe("2.0.0");
		});
	});

	describe("category merging", () => {
		it("merges categories from multiple releases", () => {
			const aggregator = new PackageAggregator("repo");
			const releases = [
				createRelease("v1.0.0", [
					{ id: "features", title: "Features", items: [{ text: "Feature A" }] },
				]),
				createRelease("v1.1.0", [
					{ id: "features", title: "Features", items: [{ text: "Feature B" }] },
				]),
			];

			const result = aggregator.aggregate(releases);

			const features = result.packages[0].categories.find(
				(c) => c.id === "features",
			);
			expect(features?.items).toHaveLength(2);
			expect(features?.items.map((i) => i.text)).toContain("Feature A");
			expect(features?.items.map((i) => i.text)).toContain("Feature B");
		});

		it("deduplicates items with same text", () => {
			const aggregator = new PackageAggregator("repo");
			const releases = [
				createRelease("v1.0.0", [
					{ id: "fixes", title: "Fixes", items: [{ text: "Fix bug" }] },
				]),
				createRelease("v1.1.0", [
					{ id: "fixes", title: "Fixes", items: [{ text: "Fix bug" }] },
				]),
			];

			const result = aggregator.aggregate(releases);

			const fixes = result.packages[0].categories.find((c) => c.id === "fixes");
			expect(fixes?.items).toHaveLength(1);
		});

		it("handles different categories across releases", () => {
			const aggregator = new PackageAggregator("repo");
			const releases = [
				createRelease("v1.0.0", [
					{
						id: "features",
						title: "Features",
						items: [{ text: "New feature" }],
					},
				]),
				createRelease("v2.0.0", [
					{
						id: "breaking",
						title: "Breaking Changes",
						items: [{ text: "API change" }],
					},
				]),
			];

			const result = aggregator.aggregate(releases);

			expect(result.packages[0].categories).toHaveLength(2);
		});
	});

	describe("release summaries", () => {
		it("returns flat list of all release summaries", () => {
			const aggregator = new PackageAggregator("repo");
			const releases = [
				createRelease("@pkg/a@1.0.0"),
				createRelease("@pkg/b@1.0.0"),
				createRelease("v1.0.0"),
			];

			const result = aggregator.aggregate(releases);

			expect(result.allReleaseSummaries).toHaveLength(3);
		});

		it("includes package name in each summary", () => {
			const aggregator = new PackageAggregator("repo");
			const releases = [createRelease("@scope/pkg@1.0.0")];

			const result = aggregator.aggregate(releases);

			expect(result.allReleaseSummaries[0].packageName).toBe("@scope/pkg");
		});

		it("extracts version without prefix", () => {
			const aggregator = new PackageAggregator("repo");
			const releases = [
				createRelease("v1.2.3"),
				createRelease("@pkg/name@4.5.6"),
			];

			const result = aggregator.aggregate(releases);

			expect(result.allReleaseSummaries[0].version).toBe("1.2.3");
			expect(result.allReleaseSummaries[1].version).toBe("4.5.6");
		});
	});

	describe("main package detection", () => {
		it("marks package matching repo name as main", () => {
			const aggregator = new PackageAggregator("my-lib");
			const releases = [createRelease("@scope/my-lib@1.0.0")];

			// Manually set package name to match repo
			const result = aggregator.aggregate([
				{ ...releases[0], tag_name: "v1.0.0" },
			]);

			expect(result.packages[0].isMain).toBe(true);
		});

		it("marks packages with simple version tags as main", () => {
			const aggregator = new PackageAggregator("repo");
			const releases = [createRelease("v1.0.0")];

			const result = aggregator.aggregate(releases);

			expect(result.packages[0].isMain).toBe(true);
		});

		it("sorts main package first", () => {
			const aggregator = new PackageAggregator("repo");
			const releases = [
				createRelease("@pkg/zzzz@1.0.0"),
				createRelease("v1.0.0"),
				createRelease("@pkg/aaaa@1.0.0"),
			];

			const result = aggregator.aggregate(releases);

			expect(result.packages[0].isMain).toBe(true);
			expect(result.packages[0].name).toBe("repo");
		});

		it("sorts non-main packages alphabetically", () => {
			const aggregator = new PackageAggregator("main-repo");
			const releases = [
				createRelease("@pkg/zebra@1.0.0"),
				createRelease("@pkg/alpha@1.0.0"),
				createRelease("@pkg/beta@1.0.0"),
			];

			const result = aggregator.aggregate(releases);

			expect(result.packages.map((p) => p.name)).toEqual([
				"@pkg/alpha",
				"@pkg/beta",
				"@pkg/zebra",
			]);
		});
	});

	describe("empty input", () => {
		it("returns empty arrays for no releases", () => {
			const aggregator = new PackageAggregator("repo");
			const result = aggregator.aggregate([]);

			expect(result.packages).toEqual([]);
			expect(result.allReleaseSummaries).toEqual([]);
		});
	});
});
