import { describe, expect, it } from "vitest";
import {
	calculateAggregateQuality,
	calculateCategorizationConfidence,
	calculateCompleteness,
	calculateCompositeConfidence,
	calculateContentScore,
	calculateItemQuality,
	calculateStructuralScore,
	hasActionVerb,
	isBareConventional,
	isGenericOnly,
} from "../src/index.js";

describe("isGenericOnly", () => {
	it("returns true for generic words", () => {
		expect(isGenericOnly("fix")).toBe(true);
		expect(isGenericOnly("update")).toBe(true);
		expect(isGenericOnly("typo")).toBe(true);
		expect(isGenericOnly("lint")).toBe(true);
		expect(isGenericOnly("minor")).toBe(true);
		expect(isGenericOnly("wip")).toBe(true);
		expect(isGenericOnly("cleanup")).toBe(true);
	});

	it("returns false for descriptive text", () => {
		expect(isGenericOnly("fix memory leak")).toBe(false);
		expect(isGenericOnly("update dependencies")).toBe(false);
		expect(isGenericOnly("resolve authentication issue")).toBe(false);
	});

	it("handles case insensitivity", () => {
		expect(isGenericOnly("FIX")).toBe(true);
		expect(isGenericOnly("Fix")).toBe(true);
		expect(isGenericOnly("UPDATE")).toBe(true);
	});

	it("handles whitespace", () => {
		expect(isGenericOnly("  fix  ")).toBe(true);
		expect(isGenericOnly("  fix memory leak  ")).toBe(false);
	});
});

describe("hasActionVerb", () => {
	it("returns true for action verbs", () => {
		expect(hasActionVerb("Add new feature")).toBe(true);
		expect(hasActionVerb("Fix memory leak")).toBe(true);
		expect(hasActionVerb("Update dependencies")).toBe(true);
		expect(hasActionVerb("Remove deprecated code")).toBe(true);
		expect(hasActionVerb("Improve performance")).toBe(true);
		expect(hasActionVerb("Implement auth flow")).toBe(true);
	});

	it("returns false for non-action starts", () => {
		expect(hasActionVerb("new feature")).toBe(false);
		expect(hasActionVerb("memory leak fixed")).toBe(false);
		expect(hasActionVerb("the auth flow")).toBe(false);
	});

	it("handles case insensitivity", () => {
		expect(hasActionVerb("add new feature")).toBe(true);
		expect(hasActionVerb("ADD NEW FEATURE")).toBe(true);
	});
});

describe("isBareConventional", () => {
	it("returns true for empty text with conventional type", () => {
		expect(isBareConventional("", "fix")).toBe(true);
		expect(isBareConventional("", "feat")).toBe(true);
		expect(isBareConventional("  ", "chore")).toBe(true);
	});

	it("returns true for very short text with conventional type", () => {
		expect(isBareConventional("a", "fix")).toBe(true);
		expect(isBareConventional("ui", "fix")).toBe(true);
		expect(isBareConventional("typo", "fix")).toBe(true);
	});

	it("returns false for descriptive text with conventional type", () => {
		expect(isBareConventional("resolve memory leak", "fix")).toBe(false);
		expect(isBareConventional("add new endpoint", "feat")).toBe(false);
	});

	it("returns false when no conventional type", () => {
		expect(isBareConventional("", undefined)).toBe(false);
		expect(isBareConventional("fix", undefined)).toBe(false);
	});
});

describe("calculateStructuralScore", () => {
	it("gives full score for complete conventional commits", () => {
		const score = calculateStructuralScore(
			"resolve token refresh loop",
			"fix",
			"auth",
		);
		expect(score).toBeCloseTo(0.9, 1);
	});

	it("penalizes bare conventional commits", () => {
		const bareScore = calculateStructuralScore("", "fix", undefined);
		const fullScore = calculateStructuralScore(
			"resolve memory leak",
			"fix",
			undefined,
		);

		// Bare should be ~0.43 (0.85 * 0.5)
		expect(bareScore).toBeCloseTo(0.43, 1);
		// Full should be ~0.85
		expect(fullScore).toBeCloseTo(0.85, 1);
		// Bare should be significantly lower
		expect(bareScore).toBeLessThan(fullScore * 0.6);
	});

	it("gives base score for non-conventional text", () => {
		const score = calculateStructuralScore(
			"This is a regular commit message",
			undefined,
			undefined,
		);
		expect(score).toBeCloseTo(0.5, 1);
	});

	it("adds bonus for scope", () => {
		const withScope = calculateStructuralScore("resolve bug", "fix", "core");
		const withoutScope = calculateStructuralScore(
			"resolve bug",
			"fix",
			undefined,
		);
		expect(withScope).toBeGreaterThan(withoutScope);
	});
});

describe("calculateContentScore", () => {
	it("gives high score for ideal-length descriptive text", () => {
		const score = calculateContentScore(
			"Add comprehensive error handling for API requests",
			"feat",
			"api",
			["123"],
		);
		// Should be high: good length, conventional type, scope, refs, action verb
		expect(score).toBeGreaterThan(0.8);
	});

	it("gives low score for terse generic text", () => {
		const score = calculateContentScore("fix", undefined, undefined, []);
		// Should be low: very short, no type, no scope, no refs, generic
		expect(score).toBeLessThan(0.3);
	});

	it("penalizes very short text", () => {
		const shortScore = calculateContentScore("bug", undefined, undefined, []);
		const normalScore = calculateContentScore(
			"Fix the memory leak bug",
			undefined,
			undefined,
			[],
		);
		expect(shortScore).toBeLessThan(normalScore);
	});

	it("rewards PR/issue references", () => {
		const withRefs = calculateContentScore("Fix bug", "fix", undefined, [
			"123",
		]);
		const withoutRefs = calculateContentScore("Fix bug", "fix", undefined, []);
		expect(withRefs).toBeGreaterThan(withoutRefs);
	});

	it("rewards action verbs", () => {
		const withVerb = calculateContentScore(
			"Fix memory leak",
			undefined,
			undefined,
			[],
		);
		const withoutVerb = calculateContentScore(
			"memory leak",
			undefined,
			undefined,
			[],
		);
		expect(withVerb).toBeGreaterThan(withoutVerb);
	});
});

describe("calculateItemQuality", () => {
	it("calculates combined score with flags", () => {
		const result = calculateItemQuality({
			text: "Add new authentication endpoint",
			conventionalType: "feat",
			scope: "api",
			refs: ["123"],
		});

		expect(result.score).toBeGreaterThan(0.7);
		expect(result.structural).toBeGreaterThan(0.8);
		expect(result.content).toBeGreaterThan(0.7);
		expect(result.flags.terse).toBe(false);
		expect(result.flags.generic).toBe(false);
		expect(result.flags.bareConventional).toBe(false);
	});

	it("flags terse items", () => {
		const result = calculateItemQuality({
			text: "fix bug",
			conventionalType: "fix",
			scope: undefined,
			refs: [],
		});

		expect(result.flags.terse).toBe(true);
	});

	it("flags generic items", () => {
		const result = calculateItemQuality({
			text: "fix",
			conventionalType: undefined,
			scope: undefined,
			refs: [],
		});

		expect(result.flags.generic).toBe(true);
		expect(result.score).toBeLessThan(0.3);
	});

	it("flags bare conventional commits", () => {
		const result = calculateItemQuality({
			text: "",
			conventionalType: "fix",
			scope: undefined,
			refs: [],
		});

		expect(result.flags.bareConventional).toBe(true);
		expect(result.structural).toBeLessThan(0.5);
	});
});

describe("calculateAggregateQuality", () => {
	it("calculates averages across items", () => {
		const result = calculateAggregateQuality([
			{ text: "Add feature", conventionalType: "feat", refs: ["1"] },
			{ text: "Fix bug", conventionalType: "fix", refs: ["2"] },
		]);

		expect(result.itemCount).toBe(2);
		expect(result.averageScore).toBeGreaterThan(0);
		expect(result.terseRatio).toBeGreaterThan(0); // Both are short
	});

	it("calculates ratios correctly", () => {
		const result = calculateAggregateQuality([
			{
				text: "Add comprehensive feature",
				conventionalType: "feat",
				refs: ["1"],
			},
			{ text: "fix", conventionalType: undefined, refs: [] },
			{ text: "lint", conventionalType: undefined, refs: [] },
		]);

		// 2 of 3 items are terse and generic
		expect(result.terseRatio).toBeCloseTo(2 / 3, 1);
		expect(result.genericRatio).toBeCloseTo(2 / 3, 1);
	});

	it("handles empty array", () => {
		const result = calculateAggregateQuality([]);
		expect(result.itemCount).toBe(0);
		expect(result.averageScore).toBe(0);
	});
});

describe("calculateCompleteness", () => {
	it("returns 1 when extracted equals estimated", () => {
		expect(calculateCompleteness(10, 10)).toBe(1);
	});

	it("returns ratio when extracted less than estimated", () => {
		expect(calculateCompleteness(5, 10)).toBe(0.5);
		expect(calculateCompleteness(8, 10)).toBe(0.8);
	});

	it("caps at 1 when extracted exceeds estimated", () => {
		expect(calculateCompleteness(15, 10)).toBe(1);
	});

	it("returns 1 when estimated is 0", () => {
		expect(calculateCompleteness(5, 0)).toBe(1);
	});
});

describe("calculateCategorizationConfidence", () => {
	it("gives high score for explicit signals", () => {
		const score = calculateCategorizationConfidence([
			"explicit_breaking",
			"conventional_commit",
			"conventional_commit",
		]);
		expect(score).toBeGreaterThan(0.9);
	});

	it("gives lower score for weaker signals", () => {
		const highScore = calculateCategorizationConfidence([
			"conventional_commit",
			"conventional_commit",
		]);
		const lowScore = calculateCategorizationConfidence([
			"no_signal",
			"no_signal",
		]);

		expect(highScore).toBeGreaterThan(lowScore);
	});

	it("handles empty array", () => {
		const score = calculateCategorizationConfidence([]);
		expect(score).toBe(0.5); // Default
	});
});

describe("calculateCompositeConfidence", () => {
	it("calculates weighted composite for high-quality items", () => {
		const result = calculateCompositeConfidence(
			0.9, // High format confidence
			[
				{
					text: "Add comprehensive error handling",
					conventionalType: "feat",
					scope: "api",
					refs: ["123"],
				},
				{
					text: "Fix memory leak in cache module",
					conventionalType: "fix",
					scope: "core",
					refs: ["456"],
				},
			],
			2,
			["conventional_commit", "conventional_commit"],
		);

		expect(result.composite).toBeGreaterThan(0.75);
		expect(result.structural).toBeGreaterThan(0.8);
		expect(result.quality).toBeGreaterThan(0.7);
		expect(result.completeness).toBe(1);
	});

	it("reduces composite for low-quality items", () => {
		const result = calculateCompositeConfidence(
			0.9, // High format confidence
			[
				{ text: "fix", conventionalType: undefined, refs: [] },
				{ text: "lint", conventionalType: undefined, refs: [] },
				{ text: "typo", conventionalType: undefined, refs: [] },
			],
			3,
			["no_signal", "no_signal", "no_signal"],
		);

		// Should be significantly lower despite high format confidence
		expect(result.composite).toBeLessThan(0.6);
		expect(result.metrics.terseRatio).toBe(1); // All items are terse
		expect(result.metrics.genericRatio).toBe(1); // All items are generic
	});

	it("applies terse penalty when ratio exceeds threshold", () => {
		const highQuality = calculateCompositeConfidence(
			0.9,
			[
				{
					text: "Add comprehensive feature",
					conventionalType: "feat",
					refs: ["1"],
				},
			],
			1,
		);

		const lowQuality = calculateCompositeConfidence(
			0.9,
			[
				{ text: "fix", refs: [] },
				{ text: "lint", refs: [] },
				{ text: "typo", refs: [] },
				{ text: "wip", refs: [] },
				{ text: "Add feature", conventionalType: "feat", refs: ["1"] },
			],
			5,
		);

		// Low quality should have penalty applied
		expect(lowQuality.composite).toBeLessThan(highQuality.composite);
		expect(lowQuality.metrics.terseRatio).toBeGreaterThan(0.2); // Above penalty threshold
	});

	it("provides dimensional breakdown", () => {
		const result = calculateCompositeConfidence(
			0.85,
			[
				{
					text: "Fix authentication bug",
					conventionalType: "fix",
					scope: "auth",
					refs: ["123"],
				},
			],
			1,
			["conventional_commit"],
		);

		expect(result).toHaveProperty("composite");
		expect(result).toHaveProperty("structural");
		expect(result).toHaveProperty("quality");
		expect(result).toHaveProperty("completeness");
		expect(result).toHaveProperty("categorization");
		expect(result).toHaveProperty("metrics");
	});

	describe("real-world scenario: shadcn-ui/ui", () => {
		it("penalizes releases with many terse items", () => {
			// Simulating shadcn-ui/ui data with 66% low-quality items
			const result = calculateCompositeConfidence(
				0.9, // Changesets format
				[
					// High quality items from release notes (3 items)
					{
						text: "do not install base style when adding themes",
						conventionalType: undefined,
						refs: ["8900"],
					},
					{
						text: "Fix utils import transform when workspace alias does not start with @",
						conventionalType: undefined,
						refs: ["7557"],
					},
					{
						text: "update color value detection for cssVars",
						conventionalType: undefined,
						refs: ["8901"],
					},
					// Low quality items from commits (6 items = 66% terse)
					{ text: "fix", conventionalType: "fix", refs: [] },
					{ text: "lint", conventionalType: undefined, refs: [] },
					{ text: "sidebar", conventionalType: undefined, refs: [] },
					{ text: "font size", conventionalType: undefined, refs: [] },
					{ text: "nav color", conventionalType: undefined, refs: [] },
					{ text: "minor updates", conventionalType: undefined, refs: [] },
				],
				9,
				[
					"keyword_match",
					"keyword_match",
					"keyword_match",
					"no_signal",
					"no_signal",
					"no_signal",
					"no_signal",
					"no_signal",
					"no_signal",
				],
			);

			// With 66% terse items, composite should be significantly lower than 90%
			// The model correctly penalizes releases with many low-quality entries
			expect(result.composite).toBeLessThan(0.6); // Much lower than format confidence of 0.9
			expect(result.composite).toBeGreaterThan(0.3); // But not below floor
			expect(result.metrics.terseRatio).toBeGreaterThan(0.5); // Confirms many terse items
			expect(result.metrics.genericRatio).toBeGreaterThan(0.1); // Some generic items

			// The key insight: 90% format confidence becomes ~43% composite
			// This accurately reflects that the OUTPUT is mostly unhelpful
		});

		it("gives higher score when fewer terse items", () => {
			// Simulating a better-documented release
			const result = calculateCompositeConfidence(
				0.9,
				[
					{
						text: "Add comprehensive error handling for API requests",
						conventionalType: "feat",
						scope: "api",
						refs: ["123"],
					},
					{
						text: "Fix memory leak in cache module",
						conventionalType: "fix",
						scope: "core",
						refs: ["456"],
					},
					{
						text: "Update authentication flow",
						conventionalType: "refactor",
						scope: "auth",
						refs: ["789"],
					},
					// Only one terse item (25%)
					{ text: "typo", conventionalType: undefined, refs: [] },
				],
				4,
				[
					"conventional_commit",
					"conventional_commit",
					"conventional_commit",
					"no_signal",
				],
			);

			// With mostly good items, should be higher
			expect(result.composite).toBeGreaterThan(0.65);
			expect(result.metrics.terseRatio).toBe(0.25); // Only 25% terse
		});
	});
});
