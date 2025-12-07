/**
 * CLI Integration Tests
 *
 * These tests spawn the actual CLI as a subprocess to verify
 * end-to-end behavior. They test the CLI as users would experience it.
 */

import { readFile } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTempConfigDir, runCLI } from "../helpers/cli.js";

describe("CLI Integration", () => {
	describe("help and version", () => {
		it("shows help with --help", () => {
			const result = runCLI(["--help"]);

			expect(result.success).toBe(true);
			expect(result.stdout).toContain("whatsnew");
			expect(result.stdout).toContain("USAGE");
			expect(result.stdout).toContain("CONFIG COMMANDS");
		});

		it("shows help with -h alias", () => {
			const result = runCLI(["-h"]);

			expect(result.success).toBe(true);
			expect(result.stdout).toContain("whatsnew");
		});

		it("shows version with --version", () => {
			const result = runCLI(["--version"]);

			expect(result.success).toBe(true);
			expect(result.stdout).toMatch(/whatsnew v\d+\.\d+\.\d+/);
		});

		it("shows version with -v alias", () => {
			const result = runCLI(["-v"]);

			expect(result.success).toBe(true);
			expect(result.stdout).toMatch(/whatsnew v\d+\.\d+\.\d+/);
		});
	});

	describe("error handling", () => {
		it("fails with no arguments", () => {
			const result = runCLI([]);

			expect(result.success).toBe(false);
			expect(result.output).toContain("No repository specified");
		});

		it("fails with invalid repo format", () => {
			const result = runCLI(["invalid-repo"]);

			expect(result.success).toBe(false);
			expect(result.output).toContain("Invalid repository format");
			expect(result.output).toContain("owner/repo");
		});

		it("fails with unknown flag", () => {
			const result = runCLI(["--unknown-flag"]);

			expect(result.success).toBe(false);
			expect(result.output).toContain("Unknown flag");
		});

		it("fails with invalid format option", () => {
			const result = runCLI(["owner/repo", "--format", "invalid"]);

			expect(result.success).toBe(false);
			expect(result.output).toContain("Invalid format");
		});

		it("fails with invalid filter option", () => {
			const result = runCLI(["owner/repo", "--filter", "invalid"]);

			expect(result.success).toBe(false);
			expect(result.output).toContain("Invalid filter");
		});
	});

	describe("filter options in help", () => {
		it("shows filter options in help text", () => {
			const result = runCLI(["--help"]);

			expect(result.success).toBe(true);
			expect(result.stdout).toContain("FILTER OPTIONS");
			expect(result.stdout).toContain("--important");
			expect(result.stdout).toContain("-i");
			expect(result.stdout).toContain("--filter");
		});
	});

	describe("config commands", () => {
		let tempConfig: Awaited<ReturnType<typeof createTempConfigDir>>;

		beforeEach(async () => {
			tempConfig = await createTempConfigDir();
		});

		afterEach(async () => {
			await tempConfig.cleanup();
		});

		describe("config path", () => {
			it("shows config file path", () => {
				const result = runCLI(["config", "path"], { env: tempConfig.env });

				expect(result.success).toBe(true);
				expect(result.stdout.trim()).toBe(tempConfig.configPath);
			});
		});

		describe("config list", () => {
			it("shows configuration with defaults", () => {
				const result = runCLI(["config", "list"], { env: tempConfig.env });

				expect(result.success).toBe(true);
				expect(result.stdout).toContain("Configuration:");
				expect(result.stdout).toContain("github_token:");
				expect(result.stdout).toContain("(not set)");
				expect(result.stdout).toContain("ai.provider:");
				expect(result.stdout).toContain("anthropic");
				expect(result.stdout).toContain("[default]");
			});

			it("shows env source when token set via env", () => {
				const result = runCLI(["config", "list"], {
					env: {
						...tempConfig.env,
						GITHUB_TOKEN: "ghp_abcd1234efgh5678",
					},
				});

				expect(result.success).toBe(true);
				expect(result.stdout).toContain("[env]");
				expect(result.stdout).toContain("ghp_****5678"); // masked: first 4 + **** + last 4
			});
		});

		describe("config set", () => {
			it("sets github_token with --skip-validation", async () => {
				const result = runCLI(
					[
						"config",
						"set",
						"github_token",
						"ghp_testtoken456",
						"--skip-validation",
					],
					{ env: tempConfig.env },
				);

				expect(result.success).toBe(true);
				expect(result.stdout).toContain("Config saved");

				// Verify file was created
				const content = await readFile(tempConfig.configPath, "utf-8");
				const config = JSON.parse(content);
				expect(config.github_token).toBe("ghp_testtoken456");
			});

			it("sets ai.api_key and detects provider", async () => {
				const result = runCLI(
					[
						"config",
						"set",
						"ai.api_key",
						"sk-ant-api03-testkey",
						"--skip-validation",
					],
					{ env: tempConfig.env },
				);

				expect(result.success).toBe(true);
				expect(result.stdout).toContain("Detected provider: anthropic");

				const content = await readFile(tempConfig.configPath, "utf-8");
				const config = JSON.parse(content);
				expect(config.ai.api_key).toBe("sk-ant-api03-testkey");
			});

			it("sets ai.provider", async () => {
				const result = runCLI(["config", "set", "ai.provider", "openai"], {
					env: tempConfig.env,
				});

				expect(result.success).toBe(true);

				const content = await readFile(tempConfig.configPath, "utf-8");
				const config = JSON.parse(content);
				expect(config.ai.provider).toBe("openai");
			});

			it("fails with invalid provider", () => {
				const result = runCLI(["config", "set", "ai.provider", "invalid"], {
					env: tempConfig.env,
				});

				expect(result.success).toBe(false);
				expect(result.output).toContain("Invalid provider");
			});

			it("fails with missing key", () => {
				const result = runCLI(["config", "set"], { env: tempConfig.env });

				expect(result.success).toBe(false);
				expect(result.output).toContain("Usage:");
			});

			it("fails with missing value", () => {
				const result = runCLI(["config", "set", "github_token"], {
					env: tempConfig.env,
				});

				expect(result.success).toBe(false);
				expect(result.output).toContain("Usage:");
			});
		});

		describe("config unset", () => {
			it("removes a config value", async () => {
				// First set a value
				runCLI(
					[
						"config",
						"set",
						"github_token",
						"ghp_toremove",
						"--skip-validation",
					],
					{ env: tempConfig.env },
				);

				// Then unset it
				const result = runCLI(["config", "unset", "github_token"], {
					env: tempConfig.env,
				});

				expect(result.success).toBe(true);
				expect(result.stdout).toContain("Removed");

				const content = await readFile(tempConfig.configPath, "utf-8");
				const config = JSON.parse(content);
				expect(config.github_token).toBeUndefined();
			});

			it("fails with missing key", () => {
				const result = runCLI(["config", "unset"], { env: tempConfig.env });

				expect(result.success).toBe(false);
				expect(result.output).toContain("Usage:");
			});
		});

		describe("config priority", () => {
			it("env var overrides config file", async () => {
				// Set via config file first
				runCLI(
					[
						"config",
						"set",
						"github_token",
						"ghp_fromconfigfile",
						"--skip-validation",
					],
					{ env: tempConfig.env },
				);

				// List with env var set - env should take priority over config
				const result = runCLI(["config", "list"], {
					env: {
						...tempConfig.env,
						GITHUB_TOKEN: "ghp_fromenvtoken1234",
					},
				});

				expect(result.success).toBe(true);
				expect(result.stdout).toContain("[env]");
				expect(result.stdout).toContain("ghp_****1234"); // env value (last 4 chars), not config
			});
		});
	});

	describe("config file permissions", () => {
		let tempConfig: Awaited<ReturnType<typeof createTempConfigDir>>;

		beforeEach(async () => {
			tempConfig = await createTempConfigDir();
		});

		afterEach(async () => {
			await tempConfig.cleanup();
		});

		it("creates config file with secure permissions", async () => {
			// Skip on Windows
			if (process.platform === "win32") {
				return;
			}

			runCLI(
				["config", "set", "github_token", "ghp_test", "--skip-validation"],
				{ env: tempConfig.env },
			);

			const { stat } = await import("node:fs/promises");
			const stats = await stat(tempConfig.configPath);

			// Check file permissions are 0600 (owner read/write only)
			const mode = stats.mode & 0o777;
			expect(mode).toBe(0o600);
		});

		it("creates config directory with secure permissions", async () => {
			// Skip on Windows
			if (process.platform === "win32") {
				return;
			}

			runCLI(
				["config", "set", "github_token", "ghp_test", "--skip-validation"],
				{ env: tempConfig.env },
			);

			const { stat } = await import("node:fs/promises");
			const stats = await stat(tempConfig.configDir);

			// Check directory permissions are 0700 (owner rwx only)
			const mode = stats.mode & 0o777;
			expect(mode).toBe(0o700);
		});
	});
});

describe("CLI Integration (with network)", () => {
	// These tests make real API calls - run separately or skip in CI without tokens
	const hasGitHubToken = Boolean(process.env.GITHUB_TOKEN);

	describe.skipIf(!hasGitHubToken)("real API calls", () => {
		it("fetches latest release", () => {
			const result = runCLI(["vercel/ai", "--format", "json"], {
				timeout: 30000,
			});

			expect(result.success).toBe(true);

			const data = JSON.parse(result.stdout);
			expect(data.spec).toBe("wnf/0.1");
			expect(data.source.platform).toBe("github");
			expect(data.source.repo).toBe("vercel/ai");
		});

		it("fetches release from repo with standard tag format", () => {
			// Using a repo with standard vX.Y.Z tags (not monorepo-style)
			const result = runCLI(["facebook/react@v18.2.0", "--format", "json"], {
				timeout: 30000,
			});

			expect(result.success).toBe(true);

			const data = JSON.parse(result.stdout);
			expect(data.version).toContain("18.2");
		});

		it("filters to important categories with --important flag", () => {
			const result = runCLI(["vercel/ai", "--format", "json", "--important"], {
				timeout: 30000,
			});

			expect(result.success).toBe(true);

			const data = JSON.parse(result.stdout);
			expect(data.spec).toBe("wnf/0.1");

			// Verify only important categories are present (or maintenance with breaking items)
			const maintenanceCategories = [
				"deps",
				"refactor",
				"chore",
				"docs",
				"other",
			];

			// All returned categories should be important (or contain breaking items)
			for (const category of data.categories) {
				if (maintenanceCategories.includes(category.id)) {
					// If a maintenance category is returned, it should only have breaking items
					for (const item of category.items) {
						expect(item.breaking).toBe(true);
					}
				}
			}
		});

		it("filters to important categories with -i shorthand", () => {
			const result = runCLI(["vercel/ai", "--format", "json", "-i"], {
				timeout: 30000,
			});

			expect(result.success).toBe(true);

			const data = JSON.parse(result.stdout);
			expect(data.spec).toBe("wnf/0.1");
		});
	});
});
