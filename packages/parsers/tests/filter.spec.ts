import type { Category } from "@whatsnew/types";
import { describe, expect, it } from "vitest";
import {
	filterCategories,
	IMPORTANT_CATEGORIES,
	isImportantCategory,
	isMaintenanceCategory,
	MAINTENANCE_CATEGORIES,
} from "../src/filter/index";

describe("filterCategories", () => {
	const mockCategories: Category[] = [
		{
			id: "breaking",
			title: "Breaking Changes",
			items: [{ text: "Removed deprecated API", refs: ["#100"] }],
		},
		{
			id: "features",
			title: "New Features",
			items: [{ text: "Added new feature X", refs: ["#101"] }],
		},
		{
			id: "fixes",
			title: "Bug Fixes",
			items: [{ text: "Fixed crash on startup", refs: ["#102"] }],
		},
		{
			id: "deps",
			title: "Dependencies",
			items: [
				{ text: "Bump Node.js to v20", refs: ["#103"], breaking: true },
				{ text: "Update lodash to 4.17.21", refs: ["#104"] },
			],
		},
		{
			id: "chore",
			title: "Chores",
			items: [{ text: "Update CI workflow", refs: ["#105"] }],
		},
		{
			id: "docs",
			title: "Documentation",
			items: [{ text: "Update README", refs: ["#106"] }],
		},
	];

	describe("filter=all", () => {
		it("returns all categories unchanged", () => {
			const result = filterCategories(mockCategories, "all");
			expect(result).toHaveLength(6);
			expect(result).toEqual(mockCategories);
		});

		it("defaults to all when no filter specified", () => {
			const result = filterCategories(mockCategories);
			expect(result).toHaveLength(6);
		});
	});

	describe("filter=important", () => {
		it("returns only important categories", () => {
			const result = filterCategories(mockCategories, "important");
			const ids = result.map((c) => c.id);

			expect(ids).toContain("breaking");
			expect(ids).toContain("features");
			expect(ids).toContain("fixes");
			expect(ids).not.toContain("chore");
			expect(ids).not.toContain("docs");
		});

		it("includes breaking items from non-important categories", () => {
			const result = filterCategories(mockCategories, "important");
			const deps = result.find((c) => c.id === "deps");

			// deps category should be included because it has a breaking item
			expect(deps).toBeDefined();
			expect(deps?.items).toHaveLength(1);
			expect(deps?.items[0].breaking).toBe(true);
			expect(deps?.items[0].text).toBe("Bump Node.js to v20");
		});

		it("excludes non-important categories with no breaking items", () => {
			const result = filterCategories(mockCategories, "important");
			const chore = result.find((c) => c.id === "chore");
			const docs = result.find((c) => c.id === "docs");

			expect(chore).toBeUndefined();
			expect(docs).toBeUndefined();
		});
	});

	describe("filter=maintenance", () => {
		it("returns only maintenance categories", () => {
			const result = filterCategories(mockCategories, "maintenance");
			const ids = result.map((c) => c.id);

			expect(ids).toContain("deps");
			expect(ids).toContain("chore");
			expect(ids).toContain("docs");
			expect(ids).not.toContain("breaking");
			expect(ids).not.toContain("features");
			expect(ids).not.toContain("fixes");
		});

		it("excludes breaking items from maintenance categories", () => {
			const result = filterCategories(mockCategories, "maintenance");
			const deps = result.find((c) => c.id === "deps");

			// deps should have only the non-breaking item
			expect(deps).toBeDefined();
			expect(deps?.items).toHaveLength(1);
			expect(deps?.items[0].breaking).toBeUndefined();
			expect(deps?.items[0].text).toBe("Update lodash to 4.17.21");
		});
	});

	describe("edge cases", () => {
		it("handles empty categories array", () => {
			const result = filterCategories([], "important");
			expect(result).toHaveLength(0);
		});

		it("returns empty array when no categories match filter", () => {
			const maintenanceOnly: Category[] = [
				{
					id: "chore",
					title: "Chores",
					items: [{ text: "Update CI", refs: [] }],
				},
			];

			const result = filterCategories(maintenanceOnly, "important");
			expect(result).toHaveLength(0);
		});

		it("filters out category when all items are breaking (maintenance filter)", () => {
			const allBreaking: Category[] = [
				{
					id: "deps",
					title: "Dependencies",
					items: [
						{ text: "Bump Node.js to v20", breaking: true, refs: [] },
						{ text: "Bump TypeScript to v5", breaking: true, refs: [] },
					],
				},
			];

			const result = filterCategories(allBreaking, "maintenance");
			expect(result).toHaveLength(0);
		});
	});
});

describe("isImportantCategory", () => {
	it("returns true for important categories", () => {
		expect(isImportantCategory("breaking")).toBe(true);
		expect(isImportantCategory("security")).toBe(true);
		expect(isImportantCategory("features")).toBe(true);
		expect(isImportantCategory("fixes")).toBe(true);
		expect(isImportantCategory("perf")).toBe(true);
	});

	it("returns false for maintenance categories", () => {
		expect(isImportantCategory("deps")).toBe(false);
		expect(isImportantCategory("refactor")).toBe(false);
		expect(isImportantCategory("chore")).toBe(false);
		expect(isImportantCategory("docs")).toBe(false);
		expect(isImportantCategory("other")).toBe(false);
	});
});

describe("isMaintenanceCategory", () => {
	it("returns true for maintenance categories", () => {
		expect(isMaintenanceCategory("deps")).toBe(true);
		expect(isMaintenanceCategory("refactor")).toBe(true);
		expect(isMaintenanceCategory("chore")).toBe(true);
		expect(isMaintenanceCategory("docs")).toBe(true);
		expect(isMaintenanceCategory("other")).toBe(true);
	});

	it("returns false for important categories", () => {
		expect(isMaintenanceCategory("breaking")).toBe(false);
		expect(isMaintenanceCategory("security")).toBe(false);
		expect(isMaintenanceCategory("features")).toBe(false);
		expect(isMaintenanceCategory("fixes")).toBe(false);
		expect(isMaintenanceCategory("perf")).toBe(false);
	});
});

describe("category arrays", () => {
	it("IMPORTANT_CATEGORIES contains expected categories", () => {
		expect(IMPORTANT_CATEGORIES).toContain("breaking");
		expect(IMPORTANT_CATEGORIES).toContain("security");
		expect(IMPORTANT_CATEGORIES).toContain("features");
		expect(IMPORTANT_CATEGORIES).toContain("fixes");
		expect(IMPORTANT_CATEGORIES).toContain("perf");
		expect(IMPORTANT_CATEGORIES).toHaveLength(5);
	});

	it("MAINTENANCE_CATEGORIES contains expected categories", () => {
		expect(MAINTENANCE_CATEGORIES).toContain("deps");
		expect(MAINTENANCE_CATEGORIES).toContain("refactor");
		expect(MAINTENANCE_CATEGORIES).toContain("chore");
		expect(MAINTENANCE_CATEGORIES).toContain("docs");
		expect(MAINTENANCE_CATEGORIES).toContain("other");
		expect(MAINTENANCE_CATEGORIES).toHaveLength(5);
	});

	it("important and maintenance categories are mutually exclusive", () => {
		for (const cat of IMPORTANT_CATEGORIES) {
			expect(MAINTENANCE_CATEGORIES).not.toContain(cat);
		}
	});

	it("together cover all 10 categories", () => {
		const allCategories = [...IMPORTANT_CATEGORIES, ...MAINTENANCE_CATEGORIES];
		expect(allCategories).toHaveLength(10);
	});
});
