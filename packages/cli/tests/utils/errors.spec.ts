import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CLIError, formatError } from "../../src/utils/errors.js";

// Set NO_COLOR to disable ANSI codes in tests
beforeEach(() => {
	vi.stubEnv("NO_COLOR", "1");
});

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("CLIError", () => {
	it("creates error with message", () => {
		const error = new CLIError("Something went wrong");

		expect(error.message).toBe("Something went wrong");
		expect(error.name).toBe("CLIError");
	});

	it("creates error with hint", () => {
		const error = new CLIError("Something went wrong", "Try this instead");

		expect(error.message).toBe("Something went wrong");
		expect(error.hint).toBe("Try this instead");
	});

	it("is instanceof Error", () => {
		const error = new CLIError("Test");

		expect(error).toBeInstanceOf(Error);
	});
});

describe("formatError", () => {
	describe("CLIError", () => {
		it("formats CLIError with message", () => {
			const error = new CLIError("Something went wrong");
			const result = formatError(error);

			expect(result).toContain("Error:");
			expect(result).toContain("Something went wrong");
		});

		it("includes hint when present", () => {
			const error = new CLIError("Something went wrong", "Try this instead");
			const result = formatError(error);

			expect(result).toContain("Something went wrong");
			expect(result).toContain("Try this instead");
		});

		it("does not include hint when not present", () => {
			const error = new CLIError("Something went wrong");
			const result = formatError(error);

			const lines = result.split("\n").filter((l) => l.trim());
			expect(lines.length).toBe(1);
		});
	});

	describe("rate limit errors", () => {
		it("formats rate limit error with suggestion", () => {
			const error = new Error("GitHub API rate limit exceeded");
			const result = formatError(error);

			expect(result).toContain("rate limit exceeded");
			expect(result).toContain("GITHUB_TOKEN");
		});
	});

	describe("not found errors", () => {
		it("formats 404 error", () => {
			const error = new Error("404 Not Found");
			const result = formatError(error);

			expect(result).toContain("Repository not found");
			expect(result).toContain("GITHUB_TOKEN");
		});

		it("formats Not Found error", () => {
			const error = new Error("Not Found");
			const result = formatError(error);

			expect(result).toContain("Repository not found");
		});
	});

	describe("network errors", () => {
		it("formats ENOTFOUND error", () => {
			const error = new Error("getaddrinfo ENOTFOUND api.github.com");
			const result = formatError(error);

			expect(result).toContain("Unable to reach GitHub API");
			expect(result).toContain("network connection");
		});

		it("formats network error", () => {
			const error = new Error("network error occurred");
			const result = formatError(error);

			expect(result).toContain("Unable to reach GitHub API");
		});
	});

	describe("generic errors", () => {
		it("formats standard Error", () => {
			const error = new Error("Something unexpected happened");
			const result = formatError(error);

			expect(result).toContain("Error:");
			expect(result).toContain("Something unexpected happened");
		});

		it("formats unknown error type", () => {
			const result = formatError("not an error");

			expect(result).toContain("unexpected error occurred");
		});

		it("formats null", () => {
			const result = formatError(null);

			expect(result).toContain("unexpected error occurred");
		});

		it("formats undefined", () => {
			const result = formatError(undefined);

			expect(result).toContain("unexpected error occurred");
		});
	});
});
