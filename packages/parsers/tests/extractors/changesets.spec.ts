import { describe, expect, it } from "vitest";
import { extractChangesets } from "../../src/extractors/changesets";

describe("extractChangesets", () => {
	describe("basic extraction", () => {
		it("should extract items from Major Changes section", () => {
			const body = `### Major Changes

- [abc1234] **(core)** Breaking: API change description`;

			const result = extractChangesets(body);

			expect(result.items).toHaveLength(1);
			expect(result.items[0].text).toBe("API change description");
			expect(result.items[0].refs).toContain("abc1234");
			expect(result.items[0].breaking).toBe(true);
			expect(result.items[0].sourceHint?.suggestedCategory).toBe("breaking");
		});

		it("should extract items from Minor Changes section", () => {
			const body = `### Minor Changes

- [def5678] **(utils)** feat: New utility function`;

			const result = extractChangesets(body);

			expect(result.items).toHaveLength(1);
			expect(result.items[0].text).toBe("New utility function");
			expect(result.items[0].refs).toContain("def5678");
			expect(result.items[0].sourceHint?.suggestedCategory).toBe("features");
		});

		it("should extract items from Patch Changes section", () => {
			const body = `### Patch Changes

- [ghi9012] **(cli)** fix: Resolve edge case`;

			const result = extractChangesets(body);

			expect(result.items).toHaveLength(1);
			expect(result.items[0].text).toBe("Resolve edge case");
			expect(result.items[0].refs).toContain("ghi9012");
			expect(result.items[0].sourceHint?.suggestedCategory).toBe("fixes");
		});
	});

	describe("dependency extraction", () => {
		it("should extract inline Updated dependencies with hash", () => {
			const body = `### Patch Changes

- Updated dependencies [abc1234]
  - @langchain/core@1.2.3
  - @langchain/openai@0.5.0`;

			const result = extractChangesets(body);

			expect(result.items).toHaveLength(1);
			expect(result.items[0].text).toBe("Updated dependencies");
			expect(result.items[0].refs).toContain("abc1234");
			expect(result.items[0].sourceHint?.suggestedCategory).toBe("deps");
		});

		it("should extract multiple dependency updates", () => {
			const body = `### Patch Changes

- Updated dependencies [abc1234]
  - @pkg/a@1.0.0
- Updated dependencies [def5678]
  - @pkg/b@2.0.0`;

			const result = extractChangesets(body);

			expect(result.items).toHaveLength(2);
			expect(result.items[0].refs).toContain("abc1234");
			expect(result.items[1].refs).toContain("def5678");
			expect(
				result.items.every((i) => i.sourceHint?.suggestedCategory === "deps"),
			).toBe(true);
		});

		it("should handle dependency-only releases (no other changes)", () => {
			const body = `### Patch Changes

- Updated dependencies [abc1234]
  - @langchain/core@1.2.3`;

			const result = extractChangesets(body);

			expect(result.items).toHaveLength(1);
			expect(result.items[0].text).toBe("Updated dependencies");
			expect(result.items[0].sourceHint?.suggestedCategory).toBe("deps");
		});

		it("should extract from standalone Updated dependencies section", () => {
			const body = `### Updated dependencies

- Updated dependencies [abc1234]
  - @pkg/a@1.0.0`;

			const result = extractChangesets(body);

			expect(result.items).toHaveLength(1);
			expect(result.items[0].refs).toContain("abc1234");
			expect(result.items[0].sourceHint?.suggestedCategory).toBe("deps");
		});

		it("should extract mixed changes and dependencies", () => {
			const body = `### Patch Changes

- [fix1234] **(core)** Fix memory leak
- Updated dependencies [dep1234]
  - @some/package@2.0.0
- [fix5678] **(utils)** Fix type issue`;

			const result = extractChangesets(body);

			expect(result.items).toHaveLength(3);

			const fixes = result.items.filter(
				(i) => i.sourceHint?.suggestedCategory === "fixes",
			);
			const deps = result.items.filter(
				(i) => i.sourceHint?.suggestedCategory === "deps",
			);

			expect(fixes).toHaveLength(2);
			expect(deps).toHaveLength(1);
		});
	});

	describe("alternative formats", () => {
		it("should extract items with alternative hash: format", () => {
			const body = `### Patch Changes

- abc1234: Fix a bug in the parser`;

			const result = extractChangesets(body);

			expect(result.items).toHaveLength(1);
			expect(result.items[0].text).toBe("Fix a bug in the parser");
			expect(result.items[0].refs).toContain("abc1234");
		});

		it("should extract conventional commit prefixes", () => {
			const body = `### Minor Changes

- [abc1234] feat(api): Add new endpoint`;

			const result = extractChangesets(body);

			expect(result.items).toHaveLength(1);
			expect(result.items[0].text).toBe("Add new endpoint");
			expect(result.items[0].conventionalType).toBe("feat");
			expect(result.items[0].scope).toBe("api");
		});
	});

	describe("metadata", () => {
		it("should return changesets format metadata", () => {
			const body = `### Patch Changes

- [abc1234] Fix something`;

			const result = extractChangesets(body);

			expect(result.metadata.format).toBe("changesets");
			expect(result.metadata.formatConfidence).toBe(0.85);
		});

		it("should extract summary from first non-header line", () => {
			const body = `This is a summary of the release.

### Patch Changes

- [abc1234] Fix something`;

			const result = extractChangesets(body);

			expect(result.metadata.summary).toBe("This is a summary of the release.");
		});
	});

	describe("edge cases", () => {
		it("should return empty items for empty body", () => {
			const result = extractChangesets("");
			expect(result.items).toHaveLength(0);
		});

		it("should return empty items for body with no changesets sections", () => {
			const body = `## Release Notes

This is not a changesets format release.`;

			const result = extractChangesets(body);
			expect(result.items).toHaveLength(0);
		});

		it("should handle Windows line endings", () => {
			const body = "### Patch Changes\r\n\r\n- [abc1234] Fix bug";

			const result = extractChangesets(body);

			expect(result.items).toHaveLength(1);
			expect(result.items[0].text).toBe("Fix bug");
		});
	});
});
