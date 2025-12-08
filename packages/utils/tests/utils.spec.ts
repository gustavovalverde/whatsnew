import { describe, expect, it } from "vitest";
import {
	escapeRegex,
	extractBreakingDescription,
	extractGitHubRefs,
	extractGitLabRefs,
	extractPackageName,
	extractRefs,
	extractVersion,
	hasBreakingMarker,
	isBreakingChange,
	isMajorSection,
	isMonorepoTag,
	normalizeForComparison,
	normalizeForDeduplication,
	normalizeLineEndings,
	normalizeWhitespace,
	parseVersion,
	stripTrailingRefs,
} from "../src/index.js";

describe("escapeRegex", () => {
	it("escapes special regex characters", () => {
		expect(escapeRegex("hello (world)")).toBe("hello \\(world\\)");
		expect(escapeRegex("a*b+c?")).toBe("a\\*b\\+c\\?");
		expect(escapeRegex("[test]")).toBe("\\[test\\]");
	});

	it("leaves normal text unchanged", () => {
		expect(escapeRegex("hello world")).toBe("hello world");
	});
});

describe("normalizeLineEndings", () => {
	it("converts CRLF to LF", () => {
		expect(normalizeLineEndings("line1\r\nline2\r\n")).toBe("line1\nline2\n");
	});

	it("leaves LF unchanged", () => {
		expect(normalizeLineEndings("line1\nline2\n")).toBe("line1\nline2\n");
	});
});

describe("normalizeWhitespace", () => {
	it("collapses multiple spaces", () => {
		expect(normalizeWhitespace("hello    world")).toBe("hello world");
	});

	it("trims leading and trailing whitespace", () => {
		expect(normalizeWhitespace("  hello  ")).toBe("hello");
	});
});

describe("normalizeForComparison", () => {
	it("normalizes text for comparison", () => {
		expect(normalizeForComparison("Fix: Bug in auth!")).toBe("fix bug in auth");
	});

	it("respects maxLength parameter", () => {
		expect(normalizeForComparison("this is a long text", 10)).toBe(
			"this is a ",
		);
	});
});

describe("normalizeForDeduplication", () => {
	it("removes leading #1234 - prefix", () => {
		expect(normalizeForDeduplication("#1242 - fix Inertia adapter")).toBe(
			"fix inertia adapter",
		);
	});

	it("removes leading #1234: prefix", () => {
		expect(normalizeForDeduplication("#123: Add new feature")).toBe(
			"add new feature",
		);
	});

	it("removes , by @author suffix", () => {
		expect(
			normalizeForDeduplication("fix Inertia adapter, by @kapishdima"),
		).toBe("fix inertia adapter");
	});

	it("removes by @author suffix without comma", () => {
		expect(normalizeForDeduplication("fix Inertia adapter by @user123")).toBe(
			"fix inertia adapter",
		);
	});

	it("handles combined prefix and suffix patterns", () => {
		expect(
			normalizeForDeduplication("#1242 - fix Inertia adapter, by @kapishdima"),
		).toBe("fix inertia adapter");
	});

	it("removes **scope**: prefix", () => {
		expect(normalizeForDeduplication("**auth**: Add OAuth support")).toBe(
			"add oauth support",
		);
	});

	it("removes trailing (#123) pattern", () => {
		expect(normalizeForDeduplication("Add OAuth support (#1234)")).toBe(
			"add oauth support",
		);
	});

	it("removes markdown links", () => {
		expect(
			normalizeForDeduplication("See [docs](https://example.com) for more"),
		).toBe("see for more");
	});

	it("normalizes whitespace and converts to lowercase", () => {
		expect(normalizeForDeduplication("  Fix   Bug  ")).toBe("fix bug");
	});

	it("truncates to 100 characters", () => {
		const longText = "a".repeat(150);
		expect(normalizeForDeduplication(longText)).toHaveLength(100);
	});

	it("handles complex real-world example from nuqs", () => {
		// Release body format
		const releaseText =
			"#1250 - forward processUrlSearchParams through the debounce queue, by @franky47 (closes #1249)";
		// Commit format
		const commitText =
			"forward processUrlSearchParams through the debounce queue";

		const normalizedRelease = normalizeForDeduplication(releaseText);
		const normalizedCommit = normalizeForDeduplication(commitText);

		// Both should normalize to the same thing for deduplication
		expect(normalizedRelease).toBe(normalizedCommit);
	});
});

describe("extractGitHubRefs", () => {
	it("extracts #123 format refs", () => {
		expect(extractGitHubRefs("Fixed #123 and #456")).toEqual(["123", "456"]);
	});

	it("extracts [#123](url) format refs", () => {
		expect(extractGitHubRefs("Fixed [#123](http://example.com)")).toEqual([
			"123",
		]);
	});

	it("extracts GH-123 format refs", () => {
		expect(extractGitHubRefs("Fixed GH-123")).toEqual(["123"]);
	});

	it("avoids duplicates", () => {
		expect(extractGitHubRefs("#123 and [#123](url)")).toEqual(["123"]);
	});
});

describe("extractGitLabRefs", () => {
	it("extracts !123 MR format", () => {
		expect(extractGitLabRefs("Fixed in !123")).toEqual(["123"]);
	});

	it("extracts [issue 123] format", () => {
		expect(extractGitLabRefs("See [issue 456]")).toEqual(["456"]);
	});
});

describe("extractRefs", () => {
	it("defaults to GitHub-style extraction", () => {
		expect(extractRefs("Fixed #123")).toEqual(["123"]);
	});
});

describe("stripTrailingRefs", () => {
	it("strips trailing (#123) pattern", () => {
		expect(stripTrailingRefs("Add OAuth support (#123)")).toBe(
			"Add OAuth support",
		);
	});

	it("strips trailing (#123, #456) pattern", () => {
		expect(stripTrailingRefs("Fix bugs (#123, #456)")).toBe("Fix bugs");
	});

	it("strips trailing (fixes #123) pattern", () => {
		expect(stripTrailingRefs("Update docs (fixes #789)")).toBe("Update docs");
	});

	it("strips trailing markdown link [#123](url) pattern", () => {
		expect(
			stripTrailingRefs(
				"Fix crash [#19242](https://github.com/tailwindlabs/tailwindcss/pull/19242)",
			),
		).toBe("Fix crash");
	});

	it("strips trailing markdown link wrapped in parens ([#123](url))", () => {
		expect(
			stripTrailingRefs(
				"Substitute @variant ([#19263](https://github.com/org/repo/pull/19263))",
			),
		).toBe("Substitute @variant");
	});

	it("leaves non-trailing refs unchanged", () => {
		expect(stripTrailingRefs("See #123 for details")).toBe(
			"See #123 for details",
		);
	});

	it("leaves text without refs unchanged", () => {
		expect(stripTrailingRefs("Simple text")).toBe("Simple text");
	});

	it("handles whitespace around trailing refs", () => {
		expect(stripTrailingRefs("Add feature  (#123)  ")).toBe("Add feature");
	});

	it("strips multiple consecutive trailing refs (#123) (#456)", () => {
		expect(
			stripTrailingRefs(
				"fix(core): prevent infinite recursion (#5089) (#5094)",
			),
		).toBe("fix(core): prevent infinite recursion");
	});

	it("strips multiple trailing refs with different formats", () => {
		expect(
			stripTrailingRefs(
				"Update feature (#123) [#456](https://github.com/org/repo/pull/456)",
			),
		).toBe("Update feature");
	});
});

describe("extractVersion", () => {
	it("strips v prefix", () => {
		expect(extractVersion("v1.2.3")).toBe("1.2.3");
	});

	it("strips scoped package prefix", () => {
		expect(extractVersion("@scope/pkg@1.2.3")).toBe("1.2.3");
	});

	it("strips unscoped package prefix", () => {
		expect(extractVersion("pkg@1.2.3")).toBe("1.2.3");
	});

	it("leaves version unchanged if no prefix", () => {
		expect(extractVersion("1.2.3")).toBe("1.2.3");
	});
});

describe("extractPackageName", () => {
	it("extracts scoped package name", () => {
		expect(extractPackageName("@scope/pkg@1.2.3")).toBe("@scope/pkg");
	});

	it("extracts unscoped package name", () => {
		expect(extractPackageName("pkg@1.2.3")).toBe("pkg");
	});

	it("returns null for simple version tags", () => {
		expect(extractPackageName("v1.2.3")).toBeNull();
		expect(extractPackageName("1.2.3")).toBeNull();
	});
});

describe("isMonorepoTag", () => {
	it("returns true for monorepo tags", () => {
		expect(isMonorepoTag("@whatsnew/core@1.0.0")).toBe(true);
		expect(isMonorepoTag("core@1.0.0")).toBe(true);
	});

	it("returns false for simple tags", () => {
		expect(isMonorepoTag("v1.0.0")).toBe(false);
		expect(isMonorepoTag("1.0.0")).toBe(false);
	});
});

describe("parseVersion", () => {
	it("parses standard semver", () => {
		expect(parseVersion("1.2.3")).toEqual({ major: 1, minor: 2, patch: 3 });
	});

	it("parses semver with prerelease", () => {
		expect(parseVersion("1.2.3-beta.1")).toEqual({
			major: 1,
			minor: 2,
			patch: 3,
			prerelease: "beta.1",
		});
	});

	it("returns null for invalid version", () => {
		expect(parseVersion("invalid")).toBeNull();
		expect(parseVersion("1.2")).toBeNull();
	});
});

describe("isBreakingChange", () => {
	it("detects conventional commit breaking marker", () => {
		expect(isBreakingChange("feat!: new feature")).toBe(true);
		expect(isBreakingChange("fix(api)!: change")).toBe(true);
	});

	it("detects BREAKING CHANGE footer", () => {
		expect(isBreakingChange("text\nBREAKING CHANGE: new api")).toBe(true);
		expect(isBreakingChange("BREAKING-CHANGE: changed")).toBe(true);
	});

	it("detects breaking change keyword", () => {
		expect(isBreakingChange("This is a breaking change")).toBe(true);
	});

	it("returns false for non-breaking changes", () => {
		expect(isBreakingChange("fix: minor bug")).toBe(false);
		expect(isBreakingChange("feat: new feature")).toBe(false);
	});
});

describe("hasBreakingMarker", () => {
	it("detects ! marker", () => {
		expect(hasBreakingMarker("feat!: change")).toBe(true);
		expect(hasBreakingMarker("feat(scope)!: change")).toBe(true);
	});

	it("returns false without marker", () => {
		expect(hasBreakingMarker("feat: change")).toBe(false);
	});
});

describe("extractBreakingDescription", () => {
	it("extracts BREAKING CHANGE description", () => {
		expect(
			extractBreakingDescription("text\nBREAKING CHANGE: The API changed"),
		).toBe("The API changed");
	});

	it("returns null if not found", () => {
		expect(extractBreakingDescription("normal text")).toBeNull();
	});
});

describe("isMajorSection", () => {
	it("returns true for major", () => {
		expect(isMajorSection("major")).toBe(true);
		expect(isMajorSection("Major")).toBe(true);
		expect(isMajorSection("MAJOR")).toBe(true);
	});

	it("returns false for other sections", () => {
		expect(isMajorSection("minor")).toBe(false);
		expect(isMajorSection("patch")).toBe(false);
	});
});
