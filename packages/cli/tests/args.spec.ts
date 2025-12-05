import { describe, expect, it } from "vitest";
import { parseArgs, parseTarget } from "../src/args.js";

describe("parseArgs", () => {
	describe("targets", () => {
		it("parses single target", () => {
			const result = parseArgs(["vercel/ai"]);
			expect(result.targets).toEqual(["vercel/ai"]);
		});

		it("parses multiple targets", () => {
			const result = parseArgs(["vercel/ai", "facebook/react"]);
			expect(result.targets).toEqual(["vercel/ai", "facebook/react"]);
		});

		it("returns empty targets when none provided", () => {
			const result = parseArgs([]);
			expect(result.targets).toEqual([]);
		});
	});

	describe("--help flag", () => {
		it("parses --help", () => {
			const result = parseArgs(["--help"]);
			expect(result.help).toBe(true);
		});

		it("parses -h alias", () => {
			const result = parseArgs(["-h"]);
			expect(result.help).toBe(true);
		});
	});

	describe("--version flag", () => {
		it("parses --version", () => {
			const result = parseArgs(["--version"]);
			expect(result.version).toBe(true);
		});

		it("parses -v alias", () => {
			const result = parseArgs(["-v"]);
			expect(result.version).toBe(true);
		});
	});

	describe("--since/--from flags", () => {
		it("parses --since with value", () => {
			const result = parseArgs(["--since", "v3.0.0"]);
			expect(result.since).toBe("v3.0.0");
		});

		it("parses --from as alias for --since", () => {
			const result = parseArgs(["--from", "2024-06"]);
			expect(result.since).toBe("2024-06");
		});
	});

	describe("--until/--to flags", () => {
		it("parses --until with value", () => {
			const result = parseArgs(["--until", "v4.0.0"]);
			expect(result.until).toBe("v4.0.0");
		});

		it("parses --to as alias for --until", () => {
			const result = parseArgs(["--to", "2024-12"]);
			expect(result.until).toBe("2024-12");
		});
	});

	describe("--package flag", () => {
		it("parses --package with value", () => {
			const result = parseArgs(["--package", "@ai-sdk/anthropic"]);
			expect(result.package).toBe("@ai-sdk/anthropic");
		});

		it("parses -p alias", () => {
			const result = parseArgs(["-p", "core"]);
			expect(result.package).toBe("core");
		});
	});

	describe("--format flag", () => {
		it("parses --format text", () => {
			const result = parseArgs(["--format", "text"]);
			expect(result.format).toBe("text");
		});

		it("parses --format json", () => {
			const result = parseArgs(["--format", "json"]);
			expect(result.format).toBe("json");
		});

		it("parses --format markdown", () => {
			const result = parseArgs(["--format", "markdown"]);
			expect(result.format).toBe("markdown");
		});

		it("parses -f alias", () => {
			const result = parseArgs(["-f", "json"]);
			expect(result.format).toBe("json");
		});

		it("throws on invalid format", () => {
			expect(() => parseArgs(["--format", "xml"])).toThrow(
				"Invalid format: xml",
			);
		});

		it("defaults to text format", () => {
			const result = parseArgs([]);
			expect(result.format).toBe("text");
		});
	});

	describe("unknown flags", () => {
		it("throws on unknown flag", () => {
			expect(() => parseArgs(["--unknown"])).toThrow("Unknown flag: --unknown");
		});
	});

	describe("combined arguments", () => {
		it("parses complex command", () => {
			const result = parseArgs([
				"vercel/ai",
				"--since",
				"v3.0.0",
				"--until",
				"v4.0.0",
				"--package",
				"@ai-sdk/core",
				"--format",
				"json",
			]);

			expect(result.targets).toEqual(["vercel/ai"]);
			expect(result.since).toBe("v3.0.0");
			expect(result.until).toBe("v4.0.0");
			expect(result.package).toBe("@ai-sdk/core");
			expect(result.format).toBe("json");
		});
	});
});

describe("parseTarget", () => {
	describe("simple repo names", () => {
		it("parses owner/repo format", () => {
			const result = parseTarget("vercel/ai");
			expect(result).toEqual({ repo: "vercel/ai" });
		});

		it("handles repo without version", () => {
			const result = parseTarget("facebook/react");
			expect(result).toEqual({ repo: "facebook/react" });
		});
	});

	describe("versioned targets", () => {
		it("parses repo@version with v prefix", () => {
			const result = parseTarget("vercel/ai@v4.0.0");
			expect(result).toEqual({ repo: "vercel/ai", version: "v4.0.0" });
		});

		it("parses repo@version without v prefix", () => {
			const result = parseTarget("vercel/ai@4.0.0");
			expect(result).toEqual({ repo: "vercel/ai", version: "4.0.0" });
		});

		it("parses semver with prerelease", () => {
			const result = parseTarget("vercel/ai@v4.0.0-beta.1");
			expect(result).toEqual({ repo: "vercel/ai", version: "v4.0.0-beta.1" });
		});
	});

	describe("scoped package names", () => {
		it("handles scoped package without version (@ at start)", () => {
			const result = parseTarget("@vercel/ai");
			expect(result).toEqual({ repo: "@vercel/ai" });
		});

		it("handles @ in repo name that is not a version", () => {
			const result = parseTarget("owner/repo@branch");
			// @ followed by non-version is part of repo name
			expect(result).toEqual({ repo: "owner/repo@branch" });
		});
	});

	describe("edge cases", () => {
		it("handles empty string", () => {
			const result = parseTarget("");
			expect(result).toEqual({ repo: "" });
		});

		it("handles @ as first character only", () => {
			const result = parseTarget("@");
			expect(result).toEqual({ repo: "@" });
		});
	});
});
