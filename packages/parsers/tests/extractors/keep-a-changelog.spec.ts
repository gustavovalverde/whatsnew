import { describe, expect, it } from "vitest";
import { extractKeepAChangelog } from "../../src/extractors/keep-a-changelog.js";

describe("extractKeepAChangelog", () => {
	describe("refs extraction and stripping", () => {
		it("extracts refs from changelog entries", () => {
			const changelog = `### Added
- New authentication system (#123)`;
			const result = extractKeepAChangelog(changelog);
			expect(result.items[0].refs).toContain("123");
		});

		it("strips trailing refs from text", () => {
			const changelog = `### Fixed
- Resolve memory leak (#456)`;
			const result = extractKeepAChangelog(changelog);
			expect(result.items[0].text).toBe("Resolve memory leak");
			expect(result.items[0].text).not.toContain("#456");
		});

		it("strips multiple trailing refs", () => {
			const changelog = `### Changed
- Update dependencies (#123, #456)`;
			const result = extractKeepAChangelog(changelog);
			expect(result.items[0].refs).toContain("123");
			expect(result.items[0].refs).toContain("456");
			expect(result.items[0].text).toBe("Update dependencies");
		});

		it("preserves non-trailing refs in text", () => {
			const changelog = `### Fixed
- Fix #123 regression in auth module`;
			const result = extractKeepAChangelog(changelog);
			expect(result.items[0].refs).toContain("123");
			// Non-trailing ref provides context, should stay
			expect(result.items[0].text).toContain("#123");
		});
	});

	describe("no duplication in output", () => {
		it("text does not duplicate refs that are in refs field", () => {
			const changelog = `### Added
- Add OAuth support (#789)`;
			const result = extractKeepAChangelog(changelog);
			const item = result.items[0];

			expect(item.refs).toContain("789");
			expect(item.text).toBe("Add OAuth support");
			expect(item.text).not.toContain("789");
		});
	});
});
