/**
 * Contract tests for normalized extractor output
 *
 * These tests validate that ALL extractors follow the normalized data model:
 * - text: clean, human-readable description (no embedded scope/refs when extracted)
 * - scope: separate field for filtering/display
 * - refs: separate field for linking
 *
 * This prevents duplication in formatter output like:
 * BAD:  [www] **www**: minor updates (#5749) (5749)
 * GOOD: [www] minor updates (5749)
 */

import type { ExtractedItem } from "@whatsnew/types";
import { describe, expect, it } from "vitest";
import { extractChangesets } from "../../src/extractors/changesets.js";
import { extractConventionalCommits } from "../../src/extractors/conventional-commits.js";
import { extractGeneric } from "../../src/extractors/generic.js";
import { extractGitHubAuto } from "../../src/extractors/github-auto.js";
import { extractGitLabOfficial } from "../../src/extractors/gitlab-official.js";
import { extractKeepAChangelog } from "../../src/extractors/keep-a-changelog.js";

/**
 * Validates that an item follows the normalized data model contract
 */
function validateNormalizedItem(item: ExtractedItem, context: string): void {
	// If scope is extracted, it should NOT be in text as a prefix pattern
	if (item.scope) {
		const scopePatterns = [
			`**${item.scope}**:`, // Bold markdown scope
			`[${item.scope}]`, // Bracketed scope
			`(${item.scope}):`, // Parenthesized scope
		];

		for (const pattern of scopePatterns) {
			expect(
				item.text.includes(pattern),
				`${context}: text should not contain scope pattern "${pattern}" when scope is in scope field`,
			).toBe(false);
		}
	}

	// If refs are extracted, trailing ref patterns should NOT be in text
	if (item.refs && item.refs.length > 0) {
		for (const ref of item.refs) {
			// Check for trailing patterns - these should be stripped
			const trailingPatterns = [
				new RegExp(`\\(#${ref}\\)\\s*$`), // (#123) at end
				new RegExp(`\\[#${ref}\\]\\([^)]+\\)\\s*$`), // [#123](url) at end
			];

			for (const pattern of trailingPatterns) {
				expect(
					pattern.test(item.text),
					`${context}: text "${item.text}" should not have trailing ref pattern for #${ref}`,
				).toBe(false);
			}
		}
	}
}

describe("Normalized Output Contract", () => {
	describe("extractConventionalCommits", () => {
		it("produces normalized output - scope not in text", () => {
			const result = extractConventionalCommits("feat(api): add endpoint");
			for (const item of result.items) {
				validateNormalizedItem(item, "conventional-commits");
			}
		});

		it("produces normalized output - refs not duplicated in text", () => {
			const result = extractConventionalCommits("fix(core): bug fix (#123)");
			for (const item of result.items) {
				validateNormalizedItem(item, "conventional-commits");
			}
		});

		it("trims scope whitespace", () => {
			const result = extractConventionalCommits("feat( www ): update");
			expect(result.items[0].scope).toBe("www");
		});
	});

	describe("extractChangesets", () => {
		it("produces normalized output", () => {
			const body = `### Minor Changes
- [abc123] **(pkg-a)** feat(core): add new feature`;
			const result = extractChangesets(body);
			for (const item of result.items) {
				validateNormalizedItem(item, "changesets");
			}
		});

		it("trims scope whitespace", () => {
			const body = `### Minor Changes
- [abc123] feat( api ): add endpoint`;
			const result = extractChangesets(body);
			if (result.items[0]?.scope) {
				expect(result.items[0].scope.trim()).toBe(result.items[0].scope);
			}
		});
	});

	describe("extractGitHubAuto", () => {
		it("produces normalized output - refs stripped from PR title", () => {
			const body = `## What's Changed
* Add feature (#123) by @user in https://github.com/org/repo/pull/123`;
			const result = extractGitHubAuto(body);
			for (const item of result.items) {
				validateNormalizedItem(item, "github-auto");
			}
		});

		it("handles markdown link refs in PR title", () => {
			const body = `## What's Changed
* Fix bug ([#456](https://github.com/org/repo/pull/456)) by @user in https://github.com/org/repo/pull/456`;
			const result = extractGitHubAuto(body);
			for (const item of result.items) {
				validateNormalizedItem(item, "github-auto");
			}
		});
	});

	describe("extractKeepAChangelog", () => {
		it("produces normalized output - refs stripped", () => {
			const body = `### Added
- New authentication system (#789)`;
			const result = extractKeepAChangelog(body);
			for (const item of result.items) {
				validateNormalizedItem(item, "keep-a-changelog");
			}
		});
	});

	describe("extractGeneric", () => {
		it("produces normalized output - refs stripped", () => {
			const body = `## Changes
- Update dependencies (#123)`;
			const result = extractGeneric(body);
			for (const item of result.items) {
				validateNormalizedItem(item, "generic");
			}
		});
	});

	describe("extractGitLabOfficial", () => {
		it("produces normalized output from details blocks", () => {
			const body = `#### [Premium](url)
##### [Security](url)
<details>
<summary>[New security feature](https://docs.gitlab.com) <code>Beta</code></summary>

> Feature description here

</details>`;
			const result = extractGitLabOfficial(body);
			for (const item of result.items) {
				validateNormalizedItem(item, "gitlab-official");
			}
		});

		it("produces normalized output from standalone features", () => {
			const body = `## Features
- [New feature](https://docs.gitlab.com) (#123)`;
			const result = extractGitLabOfficial(body);
			for (const item of result.items) {
				validateNormalizedItem(item, "gitlab-official");
			}
		});
	});

	describe("edge cases", () => {
		it("handles scope with spaces in conventional commits", () => {
			// Real-world case from shadcn-ui: "feat( www): minor updates"
			const result = extractConventionalCommits("feat( www): minor updates");
			expect(result.items[0].scope).toBe("www");
			expect(result.items[0].text).toBe("minor updates");
			validateNormalizedItem(result.items[0], "edge-case-scope-spaces");
		});

		it("handles PR title with embedded ref", () => {
			// Real-world case: PR title already contains (#123) and URL also has /pull/123
			const body = `## What's Changed
* fix(shadcn) arrays and spread (#5711) by @user in https://github.com/org/repo/pull/5711`;
			const result = extractGitHubAuto(body);
			expect(result.items[0].text).not.toContain("#5711");
			expect(result.items[0].refs).toContain("5711");
			validateNormalizedItem(result.items[0], "edge-case-embedded-ref");
		});
	});
});
