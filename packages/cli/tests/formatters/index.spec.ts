import type { WNFDocument } from "@whatsnew/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { format } from "../../src/formatters/index.js";

// Set NO_COLOR to disable ANSI codes in tests
beforeEach(() => {
	vi.stubEnv("NO_COLOR", "1");
});

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("format", () => {
	const mockDocument: WNFDocument = {
		spec: "wnf/0.1",
		source: {
			platform: "github",
			repo: "vercel/ai",
		},
		version: "v1.0.0",
		summary: "Test release",
		categories: [
			{
				id: "features",
				title: "Features",
				items: [{ text: "New feature" }],
			},
		],
		links: {},
		confidence: 0.8,
		generatedFrom: ["test"],
	};

	it("formats as text by default", () => {
		const result = format(mockDocument, "text");

		expect(result).toContain("vercel/ai v1.0.0");
		expect(result).toContain("┌"); // Box drawing character
	});

	it("formats as JSON when specified", () => {
		const result = format(mockDocument, "json");

		expect(() => JSON.parse(result)).not.toThrow();
		const parsed = JSON.parse(result);
		expect(parsed.spec).toBe("wnf/0.1");
	});

	it("formats as markdown when specified", () => {
		const result = format(mockDocument, "markdown");

		expect(result).toContain("# vercel/ai v1.0.0");
		expect(result).toContain("## Features");
	});

	it("defaults to text for unknown format", () => {
		// Cast to bypass TypeScript check for this test
		const result = format(mockDocument, "unknown" as "text");

		expect(result).toContain("┌");
	});
});
