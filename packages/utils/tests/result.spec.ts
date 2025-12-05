import { describe, expect, it } from "vitest";
import {
	err,
	mapError,
	mapResult,
	ok,
	tryCatch,
	tryCatchAsync,
	unwrap,
	unwrapOr,
} from "../src/result.js";

describe("Result type", () => {
	describe("ok", () => {
		it("creates a successful result", () => {
			const result = ok(42);
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toBe(42);
			}
		});
	});

	describe("err", () => {
		it("creates a failed result", () => {
			const result = err("something went wrong");
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error).toBe("something went wrong");
			}
		});
	});

	describe("tryCatch", () => {
		it("returns ok for successful function", () => {
			const result = tryCatch(() => 42);
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toBe(42);
			}
		});

		it("returns err for throwing function", () => {
			const result = tryCatch(() => {
				throw new Error("oops");
			});
			expect(result.ok).toBe(false);
		});

		it("maps errors with custom mapper", () => {
			const result = tryCatch(
				() => {
					throw new Error("oops");
				},
				(e) => `mapped: ${(e as Error).message}`,
			);
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error).toBe("mapped: oops");
			}
		});
	});

	describe("tryCatchAsync", () => {
		it("returns ok for successful async function", async () => {
			const result = await tryCatchAsync(async () => 42);
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toBe(42);
			}
		});

		it("returns err for rejecting async function", async () => {
			const result = await tryCatchAsync(async () => {
				throw new Error("async oops");
			});
			expect(result.ok).toBe(false);
		});
	});

	describe("mapResult", () => {
		it("transforms successful result", () => {
			const result = mapResult(ok(10), (x) => x * 2);
			expect(result.ok).toBe(true);
			if (result.ok) {
				expect(result.value).toBe(20);
			}
		});

		it("passes through failed result", () => {
			const result = mapResult(err("error"), (x: number) => x * 2);
			expect(result.ok).toBe(false);
		});
	});

	describe("mapError", () => {
		it("transforms failed result", () => {
			const result = mapError(err("error"), (e) => `wrapped: ${e}`);
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error).toBe("wrapped: error");
			}
		});

		it("passes through successful result", () => {
			const result = mapError(ok(42), (e: string) => `wrapped: ${e}`);
			expect(result.ok).toBe(true);
		});
	});

	describe("unwrap", () => {
		it("returns value for successful result", () => {
			expect(unwrap(ok(42))).toBe(42);
		});

		it("throws for failed result", () => {
			expect(() => unwrap(err(new Error("oops")))).toThrow("oops");
		});
	});

	describe("unwrapOr", () => {
		it("returns value for successful result", () => {
			expect(unwrapOr(ok(42), 0)).toBe(42);
		});

		it("returns default for failed result", () => {
			expect(unwrapOr(err("error"), 0)).toBe(0);
		});
	});
});
