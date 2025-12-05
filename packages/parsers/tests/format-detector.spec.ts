import { describe, expect, it } from "vitest";
import { FormatDetector } from "../src/index";

describe("FormatDetector", () => {
	const detector = new FormatDetector();

	describe("detectFormat", () => {
		it("should detect changesets format", () => {
			const body = `
### Major Changes

- abc123: Breaking change description

### Patch Changes

- def456: Bug fix description
			`;

			expect(detector.detectFormat(body)).toBe("changesets");
		});

		it("should detect keep-a-changelog format", () => {
			const body = `
## [1.2.0] - 2024-01-15

### Added
- New feature description

### Fixed
- Bug fix description
			`;

			expect(detector.detectFormat(body)).toBe("keep-a-changelog");
		});

		it("should detect GitHub auto-generated format with What's Changed", () => {
			const body = `## What's Changed
* Add new feature by @user in https://github.com/owner/repo/pull/123
* Fix bug by @other in https://github.com/owner/repo/pull/124

**Full Changelog:** https://github.com/owner/repo/compare/v1.0.0...v2.0.0`;

			expect(detector.detectFormat(body)).toBe("github-auto");
		});

		it("should detect GitHub auto-generated format with PR entries only", () => {
			const body = `Some release description

* Add feature by @contributor in https://github.com/owner/repo/pull/1
* Fix issue by @dev in https://github.com/owner/repo/pull/2

**Full Changelog:** https://github.com/owner/repo/compare/v1...v2`;

			expect(detector.detectFormat(body)).toBe("github-auto");
		});

		it("should detect Keep-a-Changelog with only section headers (no version)", () => {
			const body = `### Added
- New feature description

### Fixed
- Bug fix description`;

			expect(detector.detectFormat(body)).toBe("keep-a-changelog");
		});

		it("should detect conventional commits format", () => {
			const body = `
feat: add new authentication system
fix(api): resolve rate limiting issue
docs: update README with examples
			`;

			expect(detector.detectFormat(body)).toBe("conventional-commits");
		});

		it("should detect conventional commits with scope", () => {
			const body =
				"feat(auth): add OAuth support\nfix(api): handle null responses";

			expect(detector.detectFormat(body)).toBe("conventional-commits");
		});

		it("should return generic for unstructured content", () => {
			const body =
				"This is just some random release notes without specific format";

			expect(detector.detectFormat(body)).toBe("generic");
		});

		it("should prioritize changesets over keep-a-changelog when both patterns exist", () => {
			const body = `
### Major Changes

- Breaking change

## [1.0.0]

### Added
- Feature
			`;

			// Changesets is checked first, so should be detected
			expect(detector.detectFormat(body)).toBe("changesets");
		});

		it("should handle empty body", () => {
			expect(detector.detectFormat("")).toBe("generic");
		});

		it("should handle body with only whitespace", () => {
			expect(detector.detectFormat("   \n\n  \t  ")).toBe("generic");
		});
	});

	describe("calculateConfidence", () => {
		it("should return 0.9 for changesets format", () => {
			const body = "### Major Changes\n- Something changed";
			expect(detector.calculateConfidence(body)).toBe(0.9);
		});

		it("should return 0.9 for keep-a-changelog format", () => {
			const body = "## [1.0.0]\n### Added\n- New feature";
			expect(detector.calculateConfidence(body)).toBe(0.9);
		});

		it("should return 0.9 for GitHub auto-generated format", () => {
			const body =
				"## What's Changed\n* Feature by @user in https://github.com/o/r/pull/1";
			expect(detector.calculateConfidence(body)).toBe(0.9);
		});

		it("should return 0.9 for Keep-a-Changelog section headers only", () => {
			const body = "### Added\n- New feature\n### Fixed\n- Bug fix";
			expect(detector.calculateConfidence(body)).toBe(0.9);
		});

		it("should return 0.85 for conventional commits format", () => {
			const body = "feat: new feature\nfix: bug fix";
			expect(detector.calculateConfidence(body)).toBe(0.85);
		});

		it("should return 0.7 for content with basic headings", () => {
			const body = "## Features\n- Added something\n### Fixes\n- Fixed bug";
			expect(detector.calculateConfidence(body)).toBe(0.7);
		});

		it("should return 0.3 for minimal content", () => {
			const body = "v1.0.0";
			expect(detector.calculateConfidence(body)).toBe(0.3);
		});

		it("should return 0.6 for moderate unstructured content", () => {
			const body =
				"This release includes several improvements and bug fixes that enhance the overall experience.";
			expect(detector.calculateConfidence(body)).toBe(0.6);
		});

		it("should return 0.3 for empty content", () => {
			expect(detector.calculateConfidence("")).toBe(0.3);
		});

		it("should return 0.3 for whitespace-only content", () => {
			expect(detector.calculateConfidence("   \n\n  ")).toBe(0.3);
		});
	});
});
