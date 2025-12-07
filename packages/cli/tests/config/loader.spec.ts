import * as fs from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock fs module
vi.mock("node:fs/promises");

// Mock paths module to control config path
vi.mock("../../src/config/paths.js", () => ({
	getConfigDir: () => "/mock/config/dir",
	getConfigPath: () => "/mock/config/dir/config.json",
}));

describe("config loader", () => {
	const originalEnv = process.env;
	const originalPlatform = process.platform;

	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
		process.env = { ...originalEnv };
		// Clear any cached env vars
		process.env.GITHUB_TOKEN = undefined;
		process.env.ANTHROPIC_API_KEY = undefined;
		process.env.OPENAI_API_KEY = undefined;
		process.env.AI_GATEWAY_API_KEY = undefined;
		process.env.AI_PROVIDER = undefined;
	});

	afterEach(() => {
		process.env = originalEnv;
		Object.defineProperty(process, "platform", { value: originalPlatform });
	});

	describe("hasInsecurePermissions", () => {
		it("returns false on Windows (skips check)", async () => {
			Object.defineProperty(process, "platform", { value: "win32" });
			const { hasInsecurePermissions } = await import(
				"../../src/config/loader.js"
			);
			expect(await hasInsecurePermissions("/any/path")).toBe(false);
		});

		it("returns true if group has permissions", async () => {
			Object.defineProperty(process, "platform", { value: "darwin" });
			vi.mocked(fs.stat).mockResolvedValue({ mode: 0o640 } as any);

			const { hasInsecurePermissions } = await import(
				"../../src/config/loader.js"
			);
			expect(await hasInsecurePermissions("/test/file")).toBe(true);
		});

		it("returns true if others have permissions", async () => {
			Object.defineProperty(process, "platform", { value: "darwin" });
			vi.mocked(fs.stat).mockResolvedValue({ mode: 0o604 } as any);

			const { hasInsecurePermissions } = await import(
				"../../src/config/loader.js"
			);
			expect(await hasInsecurePermissions("/test/file")).toBe(true);
		});

		it("returns false for 0600 permissions", async () => {
			Object.defineProperty(process, "platform", { value: "darwin" });
			vi.mocked(fs.stat).mockResolvedValue({ mode: 0o600 } as any);

			const { hasInsecurePermissions } = await import(
				"../../src/config/loader.js"
			);
			expect(await hasInsecurePermissions("/test/file")).toBe(false);
		});

		it("returns false if stat fails", async () => {
			Object.defineProperty(process, "platform", { value: "darwin" });
			vi.mocked(fs.stat).mockRejectedValue(new Error("ENOENT"));

			const { hasInsecurePermissions } = await import(
				"../../src/config/loader.js"
			);
			expect(await hasInsecurePermissions("/nonexistent")).toBe(false);
		});
	});

	describe("loadConfigFile", () => {
		it("returns empty object if config file doesn't exist", async () => {
			vi.mocked(fs.access).mockRejectedValue(new Error("ENOENT"));

			const { loadConfigFile } = await import("../../src/config/loader.js");
			expect(await loadConfigFile()).toEqual({});
		});

		it("parses valid JSON config", async () => {
			vi.mocked(fs.access).mockResolvedValue(undefined);
			vi.mocked(fs.stat).mockResolvedValue({ mode: 0o600 } as any);
			vi.mocked(fs.readFile).mockResolvedValue(
				JSON.stringify({ github_token: "ghp_test" }),
			);

			const { loadConfigFile } = await import("../../src/config/loader.js");
			expect(await loadConfigFile()).toEqual({ github_token: "ghp_test" });
		});

		it("returns empty object for invalid JSON", async () => {
			vi.mocked(fs.access).mockResolvedValue(undefined);
			vi.mocked(fs.stat).mockResolvedValue({ mode: 0o600 } as any);
			vi.mocked(fs.readFile).mockResolvedValue("not valid json");

			const { loadConfigFile } = await import("../../src/config/loader.js");
			expect(await loadConfigFile()).toEqual({});
		});
	});

	describe("resolveConfig", () => {
		beforeEach(() => {
			// Default: no config file
			vi.mocked(fs.access).mockRejectedValue(new Error("ENOENT"));
		});

		it("prioritizes CLI flags over environment variables", async () => {
			process.env.GITHUB_TOKEN = "env_token";

			const { resolveConfig } = await import("../../src/config/loader.js");
			const config = await resolveConfig({ githubToken: "flag_token" });

			expect(config.githubToken).toBe("flag_token");
			expect(config.sources.githubToken).toBe("flag");
		});

		it("prioritizes environment variables over config file", async () => {
			process.env.GITHUB_TOKEN = "env_token";
			vi.mocked(fs.access).mockResolvedValue(undefined);
			vi.mocked(fs.stat).mockResolvedValue({ mode: 0o600 } as any);
			vi.mocked(fs.readFile).mockResolvedValue(
				JSON.stringify({ github_token: "config_token" }),
			);

			const { resolveConfig } = await import("../../src/config/loader.js");
			const config = await resolveConfig({});

			expect(config.githubToken).toBe("env_token");
			expect(config.sources.githubToken).toBe("env");
		});

		it("uses config file when no flags or env vars", async () => {
			vi.mocked(fs.access).mockResolvedValue(undefined);
			vi.mocked(fs.stat).mockResolvedValue({ mode: 0o600 } as any);
			vi.mocked(fs.readFile).mockResolvedValue(
				JSON.stringify({ github_token: "config_token" }),
			);

			const { resolveConfig } = await import("../../src/config/loader.js");
			const config = await resolveConfig({});

			expect(config.githubToken).toBe("config_token");
			expect(config.sources.githubToken).toBe("config");
		});

		it("resolves AI key from ANTHROPIC_API_KEY", async () => {
			process.env.ANTHROPIC_API_KEY = "sk-ant-test";

			const { resolveConfig } = await import("../../src/config/loader.js");
			const config = await resolveConfig({});

			expect(config.aiApiKey).toBe("sk-ant-test");
			expect(config.sources.aiApiKey).toBe("env");
		});

		it("resolves AI key from OPENAI_API_KEY", async () => {
			process.env.OPENAI_API_KEY = "sk-openai-test";

			const { resolveConfig } = await import("../../src/config/loader.js");
			const config = await resolveConfig({});

			expect(config.aiApiKey).toBe("sk-openai-test");
			expect(config.sources.aiApiKey).toBe("env");
		});

		it("prioritizes ANTHROPIC_API_KEY over OPENAI_API_KEY", async () => {
			process.env.ANTHROPIC_API_KEY = "sk-ant-test";
			process.env.OPENAI_API_KEY = "sk-openai-test";

			const { resolveConfig } = await import("../../src/config/loader.js");
			const config = await resolveConfig({});

			expect(config.aiApiKey).toBe("sk-ant-test");
		});

		it("resolves AI provider from environment", async () => {
			process.env.AI_PROVIDER = "openai";

			const { resolveConfig } = await import("../../src/config/loader.js");
			const config = await resolveConfig({});

			expect(config.aiProvider).toBe("openai");
			expect(config.sources.aiProvider).toBe("env");
		});

		it("defaults AI provider to anthropic", async () => {
			const { resolveConfig } = await import("../../src/config/loader.js");
			const config = await resolveConfig({});

			expect(config.aiProvider).toBe("anthropic");
			expect(config.sources.aiProvider).toBe("default");
		});
	});

	describe("updateConfigValue", () => {
		beforeEach(() => {
			vi.mocked(fs.access).mockRejectedValue(new Error("ENOENT"));
			vi.mocked(fs.mkdir).mockResolvedValue(undefined);
			vi.mocked(fs.writeFile).mockResolvedValue(undefined);
			vi.mocked(fs.chmod).mockResolvedValue(undefined);
		});

		it("sets top-level key", async () => {
			const { updateConfigValue } = await import("../../src/config/loader.js");
			await updateConfigValue("github_token", "ghp_new");

			expect(fs.writeFile).toHaveBeenCalledWith(
				"/mock/config/dir/config.json",
				expect.stringContaining('"github_token": "ghp_new"'),
				{ mode: 0o600 },
			);
		});

		it("sets nested ai.api_key", async () => {
			const { updateConfigValue } = await import("../../src/config/loader.js");
			await updateConfigValue("ai.api_key", "sk-ant-new");

			expect(fs.writeFile).toHaveBeenCalledWith(
				"/mock/config/dir/config.json",
				expect.stringContaining('"api_key": "sk-ant-new"'),
				{ mode: 0o600 },
			);
		});

		it("validates ai.provider value", async () => {
			const { updateConfigValue } = await import("../../src/config/loader.js");

			await expect(updateConfigValue("ai.provider", "invalid")).rejects.toThrow(
				"Invalid provider",
			);
		});

		it("throws for unknown config key", async () => {
			const { updateConfigValue } = await import("../../src/config/loader.js");

			await expect(
				updateConfigValue("unknown.nested.key", "value"),
			).rejects.toThrow("Unknown config key");
		});
	});

	describe("removeConfigValue", () => {
		beforeEach(() => {
			vi.mocked(fs.mkdir).mockResolvedValue(undefined);
			vi.mocked(fs.writeFile).mockResolvedValue(undefined);
			vi.mocked(fs.chmod).mockResolvedValue(undefined);
		});

		it("removes top-level key", async () => {
			vi.mocked(fs.access).mockResolvedValue(undefined);
			vi.mocked(fs.stat).mockResolvedValue({ mode: 0o600 } as any);
			vi.mocked(fs.readFile).mockResolvedValue(
				JSON.stringify({ github_token: "ghp_test", other: "value" }),
			);

			const { removeConfigValue } = await import("../../src/config/loader.js");
			await removeConfigValue("github_token");

			expect(fs.writeFile).toHaveBeenCalledWith(
				"/mock/config/dir/config.json",
				expect.not.stringContaining("github_token"),
				{ mode: 0o600 },
			);
		});

		it("removes nested ai key and cleans up empty ai object", async () => {
			vi.mocked(fs.access).mockResolvedValue(undefined);
			vi.mocked(fs.stat).mockResolvedValue({ mode: 0o600 } as any);
			vi.mocked(fs.readFile).mockResolvedValue(
				JSON.stringify({ ai: { api_key: "sk-test" } }),
			);

			const { removeConfigValue } = await import("../../src/config/loader.js");
			await removeConfigValue("ai.api_key");

			const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
			const writtenContent = writeCall[1] as string;
			expect(writtenContent).not.toContain("ai");
		});
	});
});
