import { describe, expect, it } from "vitest";
import { extractGeneric } from "../../src/extractors/generic.js";

describe("extractGeneric", () => {
	describe("refs extraction and stripping", () => {
		it("extracts refs from bullet points", () => {
			const result = extractGeneric("- Fix authentication bug (#123)");
			expect(result.items[0].refs).toContain("123");
		});

		it("strips trailing refs from text", () => {
			const result = extractGeneric("- Fix authentication bug (#123)");
			expect(result.items[0].text).toBe("Fix authentication bug");
			expect(result.items[0].text).not.toContain("#123");
		});

		it("strips multiple trailing refs", () => {
			const result = extractGeneric("- Fix bugs (#123, #456)");
			expect(result.items[0].refs).toContain("123");
			expect(result.items[0].refs).toContain("456");
			expect(result.items[0].text).toBe("Fix bugs");
		});

		it("preserves non-trailing refs in text", () => {
			const result = extractGeneric("- See #123 for context on this fix");
			expect(result.items[0].refs).toContain("123");
			// Non-trailing ref should stay in text for context
			expect(result.items[0].text).toContain("#123");
		});
	});

	describe("no duplication in output", () => {
		it("text does not duplicate refs that are in refs field", () => {
			const result = extractGeneric("- Add new feature (#789)");
			const item = result.items[0];

			// Refs should be extracted to field
			expect(item.refs).toContain("789");
			// Text should not have the trailing ref
			expect(item.text).toBe("Add new feature");
		});
	});
});
