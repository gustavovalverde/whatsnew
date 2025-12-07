import { describe, expect, it } from "vitest";
import { extractConventionalCommits } from "../../src/extractors/conventional-commits.js";

describe("extractConventionalCommits", () => {
	describe("scope extraction", () => {
		it("extracts scope from conventional commit", () => {
			const result = extractConventionalCommits("feat(api): add endpoint");
			expect(result.items[0].scope).toBe("api");
			expect(result.items[0].text).toBe("add endpoint");
		});

		it("trims whitespace from scope", () => {
			const result = extractConventionalCommits("feat( api ): add endpoint");
			expect(result.items[0].scope).toBe("api");
		});

		it("trims leading space from scope", () => {
			const result = extractConventionalCommits("feat( www): minor updates");
			expect(result.items[0].scope).toBe("www");
		});

		it("handles scope with trailing space", () => {
			const result = extractConventionalCommits("fix(core ): bug fix");
			expect(result.items[0].scope).toBe("core");
		});
	});

	describe("refs extraction", () => {
		it("extracts refs from commit message", () => {
			const result = extractConventionalCommits("fix(api): resolve bug (#123)");
			expect(result.items[0].refs).toContain("123");
		});

		it("strips trailing refs from text", () => {
			const result = extractConventionalCommits("fix(api): resolve bug (#123)");
			expect(result.items[0].text).toBe("resolve bug");
			expect(result.items[0].text).not.toContain("#123");
		});

		it("extracts multiple refs", () => {
			const result = extractConventionalCommits(
				"fix: resolve bugs (#123, #456)",
			);
			expect(result.items[0].refs).toContain("123");
			expect(result.items[0].refs).toContain("456");
		});
	});

	describe("no duplication", () => {
		it("scope is not embedded in text when extracted", () => {
			const result = extractConventionalCommits("feat(www): add feature");
			const item = result.items[0];

			// Scope should be in scope field, not in text
			expect(item.scope).toBe("www");
			expect(item.text).toBe("add feature");
			expect(item.text).not.toContain("www");
		});

		it("refs are not in text when extracted to refs field", () => {
			const result = extractConventionalCommits("fix: bug fix (#789)");
			const item = result.items[0];

			// Refs should be in refs field, not in text
			expect(item.refs).toContain("789");
			expect(item.text).toBe("bug fix");
			expect(item.text).not.toContain("789");
		});
	});
});
