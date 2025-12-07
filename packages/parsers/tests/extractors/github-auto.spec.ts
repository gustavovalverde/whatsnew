import { describe, expect, it } from "vitest";
import { extractGitHubAuto } from "../../src/extractors/github-auto.js";

describe("extractGitHubAuto", () => {
	describe("refs extraction and stripping", () => {
		it("extracts refs from PR URL", () => {
			const body = `## What's Changed
* Add new feature by @user in https://github.com/owner/repo/pull/123`;
			const result = extractGitHubAuto(body);

			expect(result.items[0].refs).toContain("123");
		});

		it("strips trailing refs from PR title", () => {
			const body = `## What's Changed
* Fix bug in auth (#456) by @user in https://github.com/owner/repo/pull/456`;
			const result = extractGitHubAuto(body);

			// Text should not have (#456)
			expect(result.items[0].text).toBe("Fix bug in auth");
			expect(result.items[0].text).not.toContain("#456");

			// Refs should be extracted
			expect(result.items[0].refs).toContain("456");
		});

		it("handles PR titles with conventional commit format but no colon", () => {
			// This is a real-world case from shadcn-ui
			const body = `## What's Changed
* fix(shadcn) arrays and nested spread (#5711) by @user in https://github.com/owner/repo/pull/5711`;
			const result = extractGitHubAuto(body);

			// Text should not have (#5711) - only (5711) will be added by formatter
			expect(result.items[0].text).toBe("fix(shadcn) arrays and nested spread");
			expect(result.items[0].text).not.toContain("#5711");

			// Refs should be extracted
			expect(result.items[0].refs).toContain("5711");
		});
	});

	describe("no duplication in output", () => {
		it("text does not duplicate refs that are in refs field", () => {
			const body = `## What's Changed
* Add OAuth support (#789) by @user in https://github.com/owner/repo/pull/789`;
			const result = extractGitHubAuto(body);

			const item = result.items[0];

			// Refs should be in refs field
			expect(item.refs).toContain("789");

			// Text should not have the ref
			expect(item.text).toBe("Add OAuth support");
			expect(item.text).not.toContain("789");
		});
	});
});
