import { describe, expect, it } from "vitest";
import { env } from "../../src/config/env.js";

describe("env configuration", () => {
	it("parses environment variables with defaults", () => {
		// Should have loaded PORT (either from env or default 3000)
		expect(typeof env.PORT).toBe("number");
		expect(env.PORT).toBeGreaterThan(0);

		// GITHUB_TOKEN is optional
		expect(
			env.GITHUB_TOKEN === undefined || typeof env.GITHUB_TOKEN === "string",
		).toBe(true);
	});
});
