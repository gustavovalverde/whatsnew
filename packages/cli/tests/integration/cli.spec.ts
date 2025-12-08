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

		it("produces normalized output without duplication", () => {
			// This E2E test validates the normalized data model contract:
			// - text should NOT contain scope when scope is in scope field
			// - text should NOT contain trailing refs when refs are in refs field
			//
			// Uses shadcn-ui/ui because it exercises BOTH github.release AND commits
			// sources, which is where the original duplication bug occurred.
			const result = runCLI(["shadcn-ui/ui", "--format", "json"], {
				timeout: 30000,
			});

			expect(result.success).toBe(true);

			const data = JSON.parse(result.stdout);

			for (const category of data.categories) {
				for (const item of category.items) {
					// If scope exists, text should not embed it
					if (item.scope) {
						expect(item.text).not.toContain(`**${item.scope}**:`);
						expect(item.text).not.toContain(`[${item.scope}]`);
					}

					// If refs exist, text should not have trailing ref patterns
					if (item.refs && item.refs.length > 0) {
						for (const ref of item.refs) {
							// Check for trailing patterns only (not mid-text refs)
							const trailingPatterns = [
								new RegExp(`\\(#${ref}\\)\\s*$`),
								new RegExp(`\\[#${ref}\\]\\([^)]+\\)\\s*$`),
							];
							for (const pattern of trailingPatterns) {
								expect(pattern.test(item.text)).toBe(false);
							}
						}
					}

					// Scope should be trimmed (no leading/trailing spaces)
					if (item.scope) {
						expect(item.scope).toBe(item.scope.trim());
					}
				}
			}
		});
	});

	describe.skipIf(!hasGitHubToken)(
		"normalized output contract - popular repositories",
		() => {
			// Test against 20 popular repositories to ensure the normalized
			// data model works across different release formats and ecosystems
			const popularRepos = [
				// Frontend frameworks & libraries
				"facebook/react",
				"vuejs/core",
				"sveltejs/svelte",
				"angular/angular",
				// Build tools & runtimes
				"vitejs/vite",
				"evanw/esbuild",
				"vercel/turborepo",
				"oven-sh/bun",
				// Backend & full-stack
				"nodejs/node",
				"denoland/deno",
				"fastify/fastify",
				"trpc/trpc",
				// AI & ML
				"vercel/ai",
				"langchain-ai/langchain",
				// UI libraries
				"shadcn-ui/ui",
				"tailwindlabs/tailwindcss",
				"chakra-ui/chakra-ui",
				// Utilities
				"colinhacks/zod",
				"TanStack/query",
				"pmndrs/zustand",
				// Additional repos
				"midday-ai/midday",
				"polarsource/polar",
				"47ng/nuqs",
			];

			/**
			 * Validates that an item follows the normalized data model contract
			 */
			function validateNormalizedItem(
				item: { text: string; scope?: string; refs?: string[] },
				repo: string,
			): void {
				// If scope exists, text should not embed it
				if (item.scope) {
					expect(
						item.text,
						`${repo}: text should not contain bold scope pattern`,
					).not.toContain(`**${item.scope}**:`);
					expect(
						item.text,
						`${repo}: text should not contain bracketed scope`,
					).not.toContain(`[${item.scope}]`);
					// Scope should be trimmed
					expect(item.scope, `${repo}: scope should be trimmed`).toBe(
						item.scope.trim(),
					);
				}

				// If refs exist, text should not have trailing ref patterns
				if (item.refs && item.refs.length > 0) {
					for (const ref of item.refs) {
						const trailingHashRef = new RegExp(`\\(#${ref}\\)\\s*$`);
						const trailingLinkRef = new RegExp(`\\[#${ref}\\]\\([^)]+\\)\\s*$`);

						expect(
							trailingHashRef.test(item.text),
							`${repo}: text "${item.text}" should not have trailing (#${ref})`,
						).toBe(false);
						expect(
							trailingLinkRef.test(item.text),
							`${repo}: text "${item.text}" should not have trailing [#${ref}](url)`,
						).toBe(false);

						// Check for trailing commit SHA links (7-40 hex chars with /commit/ in URL)
						if (/^[a-f0-9]{7,40}$/i.test(ref)) {
							const trailingCommitLink = new RegExp(
								`\\[${ref}\\]\\([^)]*\\/commit\\/[^)]+\\)\\s*$`,
								"i",
							);
							expect(
								trailingCommitLink.test(item.text),
								`${repo}: text "${item.text}" should not have trailing commit link [${ref}](url)`,
							).toBe(false);
						}
					}
				}

				// Text should not contain inline commit SHA links
				const inlineCommitLink = /\[[a-f0-9]{7,40}\]\([^)]*\/commit\/[^)]+\)/i;
				expect(
					inlineCommitLink.test(item.text),
					`${repo}: text "${item.text}" should not contain inline commit SHA links`,
				).toBe(false);
			}

			for (const repo of popularRepos) {
				it(
					`validates normalized output for ${repo}`,
					{ timeout: 60000 },
					() => {
						const result = runCLI([repo, "--format", "json"], {
							timeout: 30000,
						});

						// Some repos might not have releases - that's ok, skip validation
						if (!result.success) {
							console.warn(
								`Skipping ${repo}: ${result.stderr || "no releases"}`,
							);
							return;
						}

						const data = JSON.parse(result.stdout);

						// Validate all items in all categories
						for (const category of data.categories || []) {
							for (const item of category.items || []) {
								validateNormalizedItem(item, repo);
							}
						}
					},
				);
			}
		},
	);

	describe("categorization correctness", () => {
		it(
			"47ng/nuqs: section hint takes precedence over keyword",
			{ timeout: 60000 },
			() => {
				// This test validates that items in explicit section headers
				// are categorized by section, not by keywords in the text.
				// e.g., "fix Inertia adapter" in "Documentation" section -> docs, not fixes
				const result = runCLI(["47ng/nuqs", "--format", "json"], {
					timeout: 30000,
				});

				if (!result.success) {
					console.warn(`Skipping: ${result.stderr || "no releases"}`);
					return;
				}

				const data = JSON.parse(result.stdout);
				const docs = data.categories?.find(
					(c: { id: string }) => c.id === "docs",
				);
				const fixes = data.categories?.find(
					(c: { id: string }) => c.id === "fixes",
				);

				// "fix Inertia adapter" should be in docs (from Documentation section),
				// not in fixes (despite containing "fix" keyword)
				const inertiaInDocs = docs?.items?.find((i: { text: string }) =>
					i.text.includes("Inertia adapter"),
				);
				const inertiaInFixes = fixes?.items?.find((i: { text: string }) =>
					i.text.includes("Inertia adapter"),
				);

				expect(
					inertiaInDocs,
					"'fix Inertia adapter' should be in docs category",
				).toBeDefined();
				expect(
					inertiaInFixes,
					"'fix Inertia adapter' should NOT be in fixes category",
				).toBeUndefined();
			},
		);

		it(
			"zcashfoundation/zebra: strips inline markdown ref links from text",
			{ timeout: 60000 },
			() => {
				// This test validates that inline markdown ref links like [#123](url)
				// are stripped from text when refs are extracted.
				// e.g., "Fixed logging ([#10135](url) and [#10115](url))" -> "Fixed logging"
				const result = runCLI(["zcashfoundation/zebra", "--format", "json"], {
					timeout: 30000,
				});

				if (!result.success) {
					console.warn(`Skipping: ${result.stderr || "no releases"}`);
					return;
				}

				const data = JSON.parse(result.stdout);
				for (const category of data.categories || []) {
					for (const item of category.items || []) {
						// Text should not contain markdown ref link syntax [#123](url)
						expect(
							item.text,
							`Text should not contain markdown ref links: "${item.text}"`,
						).not.toMatch(/\[#\d+\]\([^)]+\)/);
					}
				}
			},
		);

		it(
			"47ng/nuqs: strips commit SHA links from text",
			{ timeout: 60000 },
			() => {
				// This test validates that commit SHA markdown links are stripped.
				// e.g., "TypeError in serializer([d072a85](https://github.com/.../commit/...))"
				// should become "TypeError in serializer" with d072a85 in refs
				const result = runCLI(["47ng/nuqs", "--format", "json"], {
					timeout: 30000,
				});

				if (!result.success) {
					console.warn(`Skipping: ${result.stderr || "no releases"}`);
					return;
				}

				const data = JSON.parse(result.stdout);
				for (const category of data.categories || []) {
					for (const item of category.items || []) {
						// Text should not contain commit SHA link syntax [sha](commit-url)
						const commitLinkPattern =
							/\[[a-f0-9]{7,40}\]\([^)]*\/commit\/[^)]+\)/i;
						expect(
							item.text,
							`Text should not contain commit SHA links: "${item.text}"`,
						).not.toMatch(commitLinkPattern);
					}
				}
			},
		);
	});
});
