import { describe, expect, it } from "vitest";
import {
	extractSummary,
	formatCategoryTitle,
} from "../../src/utils/metadata.js";

describe("metadata utilities", () => {
	describe("extractSummary", () => {
		it("should extract the first non-empty line as summary", () => {
			const body = `
This is the summary line

## Changes

- Feature 1
- Feature 2
			`;

			expect(extractSummary(body)).toBe("This is the summary line");
		});

		it("should skip empty lines and extract first content line", () => {
			const body = "\n\n\nFirst line of content\nSecond line";

			expect(extractSummary(body)).toBe("First line of content");
		});

		it("should return default message for empty body", () => {
			expect(extractSummary("")).toBe("No summary available");
		});

		it("should return default message for whitespace-only body", () => {
			expect(extractSummary("   \n\n  \t  ")).toBe("No summary available");
		});

		it("should handle body with only one line", () => {
			expect(extractSummary("Single line release")).toBe("Single line release");
		});

		it("should extract first line even if it's a heading", () => {
			const body = "## Release v1.0.0\n\nChanges included...";

			expect(extractSummary(body)).toBe("## Release v1.0.0");
		});
	});

	describe("formatCategoryTitle", () => {
		it("should format 'breaking' as 'Breaking Changes'", () => {
			expect(formatCategoryTitle("breaking")).toBe("Breaking Changes");
		});

		it("should format 'features' as 'Features'", () => {
			expect(formatCategoryTitle("features")).toBe("Features");
		});

		it("should format 'fixes' as 'Bug Fixes'", () => {
			expect(formatCategoryTitle("fixes")).toBe("Bug Fixes");
		});

		it("should format 'security' as 'Security'", () => {
			expect(formatCategoryTitle("security")).toBe("Security");
		});

		it("should format 'perf' as 'Performance'", () => {
			expect(formatCategoryTitle("perf")).toBe("Performance");
		});

		it("should format 'deps' as 'Dependencies'", () => {
			expect(formatCategoryTitle("deps")).toBe("Dependencies");
		});

		it("should format 'docs' as 'Documentation'", () => {
			expect(formatCategoryTitle("docs")).toBe("Documentation");
		});

		it("should format 'refactor' as 'Refactoring'", () => {
			expect(formatCategoryTitle("refactor")).toBe("Refactoring");
		});

		it("should format 'chore' as 'Chores'", () => {
			expect(formatCategoryTitle("chore")).toBe("Chores");
		});

		it("should format 'other' as 'Other'", () => {
			expect(formatCategoryTitle("other")).toBe("Other");
		});

		it("should return the input for unknown category IDs", () => {
			// @ts-expect-error Testing unknown category
			expect(formatCategoryTitle("unknown")).toBe("unknown");
		});
	});
});
