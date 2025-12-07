import { describe, expect, it } from "vitest";
import {
	isContributorAcknowledgment,
	isContributorSection,
	validateChangelogItem,
} from "../src/item-validator.js";

describe("validateChangelogItem", () => {
	describe("rejects noise patterns", () => {
		it("rejects pure @username", () => {
			expect(validateChangelogItem("@alii").valid).toBe(false);
			expect(validateChangelogItem("@user-name").valid).toBe(false);
		});

		it("rejects markdown username links", () => {
			expect(
				validateChangelogItem("[@alii](https://github.com/alii)").valid,
			).toBe(false);
		});

		it("rejects merge commits", () => {
			expect(validateChangelogItem("Merge branch 'main'").valid).toBe(false);
			expect(
				validateChangelogItem("Merge pull request #123 from user/branch").valid,
			).toBe(false);
			expect(
				validateChangelogItem("Merge remote-tracking branch 'origin/main'")
					.valid,
			).toBe(false);
		});

		it("rejects package@version patterns", () => {
			expect(validateChangelogItem("@langchain/core@1.2.3").valid).toBe(false);
			expect(validateChangelogItem("lodash@4.17.21").valid).toBe(false);
		});

		it("rejects pure emoji", () => {
			expect(validateChangelogItem(":sparkle:").valid).toBe(false);
			expect(validateChangelogItem(":camera:").valid).toBe(false);
			expect(validateChangelogItem("🚀").valid).toBe(false);
		});

		it("rejects single-word commits", () => {
			expect(validateChangelogItem("Update").valid).toBe(false);
			expect(validateChangelogItem("Polish").valid).toBe(false);
			expect(validateChangelogItem("Fix").valid).toBe(false);
		});

		it("rejects contributor acknowledgments", () => {
			expect(
				validateChangelogItem("@user made their first contribution").valid,
			).toBe(false);
			expect(validateChangelogItem("Thanks to @contributor").valid).toBe(false);
		});

		it("rejects version-only entries", () => {
			expect(validateChangelogItem("v1.2.3").valid).toBe(false);
			expect(validateChangelogItem("1.2.3").valid).toBe(false);
			expect(validateChangelogItem("v1.2.3-alpha.1").valid).toBe(false);
		});

		it("rejects version commit messages", () => {
			expect(validateChangelogItem("Version 19.2.1").valid).toBe(false);
			expect(validateChangelogItem("Version 1.0.0").valid).toBe(false);
			expect(validateChangelogItem("version v2.3.4").valid).toBe(false);
			expect(validateChangelogItem("Version 1.2.3-beta.1").valid).toBe(false);
		});

		it("rejects empty or whitespace", () => {
			expect(validateChangelogItem("").valid).toBe(false);
			expect(validateChangelogItem("   ").valid).toBe(false);
		});

		it("rejects very short items", () => {
			expect(validateChangelogItem("fix").valid).toBe(false);
			expect(validateChangelogItem("bump").valid).toBe(false);
		});
	});

	describe("accepts valid changelog items", () => {
		it("accepts conventional commits", () => {
			const result = validateChangelogItem("feat(api): add new endpoint");
			expect(result.valid).toBe(true);
			expect(result.score).toBeGreaterThan(0.5);
		});

		it("accepts descriptive changes", () => {
			expect(
				validateChangelogItem("Fixed memory leak in connection pool").valid,
			).toBe(true);
			expect(validateChangelogItem("Add support for custom themes").valid).toBe(
				true,
			);
		});

		it("accepts changes with PR references", () => {
			const result = validateChangelogItem("Fixed authentication bug (#123)");
			expect(result.valid).toBe(true);
			expect(result.score).toBeGreaterThan(0.5);
		});

		it("accepts scoped changes", () => {
			expect(
				validateChangelogItem("**core**: implement new feature").valid,
			).toBe(true);
		});
	});

	describe("scoring", () => {
		it("gives higher score to conventional commits", () => {
			const conventional = validateChangelogItem("feat(api): add new endpoint");
			const plain = validateChangelogItem("Added new API endpoint");
			expect(conventional.score).toBeGreaterThan(plain.score);
		});

		it("gives higher score to items with PR refs", () => {
			const withRef = validateChangelogItem("Fixed bug in parser (#456)");
			const withoutRef = validateChangelogItem("Fixed bug in parser");
			expect(withRef.score).toBeGreaterThan(withoutRef.score);
		});

		it("penalizes very short items", () => {
			const short = validateChangelogItem("Fix parser"); // 10 chars - below 20, gets penalty
			const medium = validateChangelogItem("Fix the parser issue"); // 20 chars - ideal range start
			// Both start at 0.5, short gets -0.15 for <20 chars, medium gets +0.1 for ideal range
			// So short = 0.35 + 0.1 (Fix boost) = 0.45, medium = 0.6 + 0.1 (Fix boost) = 0.7
			expect(medium.score).toBeGreaterThan(short.score);
		});
	});
});

describe("isContributorAcknowledgment", () => {
	it("detects first contribution messages", () => {
		expect(
			isContributorAcknowledgment("@user made their first contribution"),
		).toBe(true);
	});

	it("detects pure usernames", () => {
		expect(isContributorAcknowledgment("@username")).toBe(true);
	});

	it("detects markdown user links", () => {
		expect(
			isContributorAcknowledgment("[@user](https://github.com/user)"),
		).toBe(true);
	});

	it("returns false for regular changelog items", () => {
		expect(isContributorAcknowledgment("Fixed authentication bug")).toBe(false);
	});
});

describe("isContributorSection", () => {
	it("detects new contributors section", () => {
		expect(isContributorSection("New Contributors")).toBe(true);
		expect(isContributorSection("## New Contributors")).toBe(true);
	});

	it("detects first-time contributors section", () => {
		expect(isContributorSection("First-time Contributors")).toBe(true);
		expect(isContributorSection("First Time Contributors")).toBe(true);
	});

	it("returns false for regular sections", () => {
		expect(isContributorSection("Bug Fixes")).toBe(false);
		expect(isContributorSection("Features")).toBe(false);
	});
});
