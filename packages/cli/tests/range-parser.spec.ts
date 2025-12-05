import { describe, expect, it } from "vitest";
import {
	expandPartialDate,
	formatDate,
	isDateLike,
	parseRange,
} from "../src/range-parser.js";

describe("isDateLike", () => {
	describe("valid date patterns", () => {
		it("recognizes YYYY format", () => {
			expect(isDateLike("2024")).toBe(true);
		});

		it("recognizes YYYY-MM format", () => {
			expect(isDateLike("2024-06")).toBe(true);
		});

		it("recognizes YYYY-MM-DD format", () => {
			expect(isDateLike("2024-06-15")).toBe(true);
		});
	});

	describe("invalid date patterns", () => {
		it("rejects version strings", () => {
			expect(isDateLike("v4.0.0")).toBe(false);
		});

		it("rejects version without v prefix", () => {
			expect(isDateLike("4.0.0")).toBe(false);
		});

		it("rejects partial version", () => {
			expect(isDateLike("4.0")).toBe(false);
		});

		it("rejects tag names", () => {
			expect(isDateLike("latest")).toBe(false);
		});

		it("rejects package names", () => {
			expect(isDateLike("@ai-sdk/core@1.0.0")).toBe(false);
		});

		it("rejects empty string", () => {
			expect(isDateLike("")).toBe(false);
		});

		it("rejects short year", () => {
			expect(isDateLike("24")).toBe(false);
		});

		it("rejects invalid month format", () => {
			expect(isDateLike("2024-6")).toBe(false);
		});
	});
});

describe("expandPartialDate", () => {
	describe("year only", () => {
		it("expands YYYY to January 1st", () => {
			const result = expandPartialDate("2024");
			expect(result.getFullYear()).toBe(2024);
			expect(result.getMonth()).toBe(0); // January
			expect(result.getDate()).toBe(1);
		});
	});

	describe("year and month", () => {
		it("expands YYYY-MM to 1st of month", () => {
			const result = expandPartialDate("2024-06");
			expect(result.getFullYear()).toBe(2024);
			expect(result.getMonth()).toBe(5); // June (0-indexed)
			expect(result.getDate()).toBe(1);
		});

		it("handles December", () => {
			const result = expandPartialDate("2024-12");
			expect(result.getMonth()).toBe(11); // December
		});
	});

	describe("full date", () => {
		it("parses YYYY-MM-DD correctly", () => {
			const result = expandPartialDate("2024-06-15");
			expect(result.getFullYear()).toBe(2024);
			expect(result.getMonth()).toBe(5);
			expect(result.getDate()).toBe(15);
		});
	});

	describe("invalid dates", () => {
		it("throws on invalid format", () => {
			expect(() => expandPartialDate("not-a-date")).toThrow(
				"Invalid date format",
			);
		});
	});
});

describe("parseRange", () => {
	describe("no range specified", () => {
		it("returns null when both since and until are undefined", () => {
			const result = parseRange(undefined, undefined);
			expect(result).toBeNull();
		});

		it("returns null when both are empty strings (edge case)", () => {
			// Note: empty strings are falsy, so this should also return null
			const result = parseRange("", "");
			expect(result).toBeNull();
		});
	});

	describe("date ranges", () => {
		it("detects date range when since is a date", () => {
			const result = parseRange("2024-06", undefined);
			expect(result).not.toBeNull();
			expect(result?.type).toBe("date");
			expect(result?.since).toBeInstanceOf(Date);
		});

		it("detects date range when until is a date", () => {
			const result = parseRange(undefined, "2024-12");
			expect(result).not.toBeNull();
			expect(result?.type).toBe("date");
			expect(result?.until).toBeInstanceOf(Date);
		});

		it("creates date range when both are dates", () => {
			const result = parseRange("2024-01", "2024-06");
			expect(result).not.toBeNull();
			expect(result?.type).toBe("date");
			expect(result?.since).toBeInstanceOf(Date);
			expect(result?.until).toBeInstanceOf(Date);
		});

		it("uses epoch for missing since in date range", () => {
			const result = parseRange(undefined, "2024-06");
			expect(result?.since).toBeInstanceOf(Date);
			expect((result?.since as Date).getTime()).toBe(0);
		});

		it("uses today for missing until in date range", () => {
			const result = parseRange("2024-01", undefined);
			const until = result?.until as Date;
			const today = new Date();
			expect(until.getFullYear()).toBe(today.getFullYear());
			expect(until.getMonth()).toBe(today.getMonth());
			expect(until.getDate()).toBe(today.getDate());
		});
	});

	describe("version ranges", () => {
		it("detects version range with v prefix", () => {
			const result = parseRange("v3.0.0", "v4.0.0");
			expect(result).not.toBeNull();
			expect(result?.type).toBe("version");
			expect(result?.since).toBe("v3.0.0");
			expect(result?.until).toBe("v4.0.0");
		});

		it("detects version range without v prefix", () => {
			const result = parseRange("3.0.0", "4.0.0");
			expect(result).not.toBeNull();
			expect(result?.type).toBe("version");
		});

		it("uses empty string for missing since", () => {
			const result = parseRange(undefined, "v4.0.0");
			expect(result?.type).toBe("version");
			expect(result?.since).toBe("");
		});

		it("uses 'latest' for missing until", () => {
			const result = parseRange("v3.0.0", undefined);
			expect(result?.type).toBe("version");
			expect(result?.until).toBe("latest");
		});

		it("handles tag names as versions", () => {
			const result = parseRange("stable", "beta");
			expect(result).not.toBeNull();
			expect(result?.type).toBe("version");
		});
	});

	describe("mixed inputs (date and version)", () => {
		it("throws error when since is date but until is version", () => {
			// Mixed date/version inputs are not supported - they would require
			// converting one type to the other which is ambiguous
			expect(() => parseRange("2024-06", "v4.0.0")).toThrow(
				"Invalid date format",
			);
		});

		it("throws error when since is version but until is date", () => {
			expect(() => parseRange("v3.0.0", "2024-12")).toThrow(
				"Invalid date format",
			);
		});
	});
});

describe("formatDate", () => {
	it("formats date as YYYY-MM-DD", () => {
		const date = new Date("2024-06-15T12:00:00Z");
		const result = formatDate(date);
		expect(result).toBe("2024-06-15");
	});

	it("pads single digit months", () => {
		const date = new Date("2024-01-05T12:00:00Z");
		const result = formatDate(date);
		expect(result).toBe("2024-01-05");
	});
});
