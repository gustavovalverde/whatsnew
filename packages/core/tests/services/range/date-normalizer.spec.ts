import { describe, expect, it } from "vitest";
import { normalizeDateRange } from "../../../src/services/range/date-normalizer.js";

describe("normalizeDateRange", () => {
	describe("since parameter", () => {
		it("converts string date to Date object", () => {
			const result = normalizeDateRange("2024-01-15");
			expect(result.since).toBeInstanceOf(Date);
			expect(result.since.toISOString()).toContain("2024-01-15");
		});

		it("passes through Date object unchanged", () => {
			const inputDate = new Date("2024-06-01T00:00:00Z");
			const result = normalizeDateRange(inputDate);
			expect(result.since).toBe(inputDate);
		});

		it("handles ISO string format", () => {
			const result = normalizeDateRange("2024-03-15T10:30:00Z");
			expect(result.since.toISOString()).toBe("2024-03-15T10:30:00.000Z");
		});
	});

	describe("until parameter", () => {
		it("converts string date to Date object", () => {
			const result = normalizeDateRange("2024-01-01", "2024-12-31");
			expect(result.until).toBeInstanceOf(Date);
			expect(result.until.toISOString()).toContain("2024-12-31");
		});

		it("passes through Date object unchanged", () => {
			const untilDate = new Date("2024-12-31T23:59:59Z");
			const result = normalizeDateRange("2024-01-01", untilDate);
			expect(result.until).toBe(untilDate);
		});

		it("defaults to current date when not provided", () => {
			const before = new Date();
			const result = normalizeDateRange("2024-01-01");
			const after = new Date();

			expect(result.until.getTime()).toBeGreaterThanOrEqual(before.getTime());
			expect(result.until.getTime()).toBeLessThanOrEqual(after.getTime());
		});
	});

	describe("edge cases", () => {
		it("handles both parameters as strings", () => {
			const result = normalizeDateRange("2024-01-01", "2024-06-30");
			expect(result.since).toBeInstanceOf(Date);
			expect(result.until).toBeInstanceOf(Date);
		});

		it("handles both parameters as Date objects", () => {
			const since = new Date("2024-01-01");
			const until = new Date("2024-06-30");
			const result = normalizeDateRange(since, until);
			expect(result.since).toBe(since);
			expect(result.until).toBe(until);
		});

		it("handles mixed parameter types", () => {
			const sinceDate = new Date("2024-01-01");
			const result = normalizeDateRange(sinceDate, "2024-06-30");
			expect(result.since).toBe(sinceDate);
			expect(result.until.toISOString()).toContain("2024-06-30");
		});
	});
});
