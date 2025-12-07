import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getConfigDir, getConfigPath } from "../../src/config/paths.js";

describe("config paths", () => {
	const originalEnv = process.env;
	const originalPlatform = process.platform;

	beforeEach(() => {
		// Reset env before each test
		vi.resetModules();
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
		Object.defineProperty(process, "platform", { value: originalPlatform });
	});

	describe("getConfigDir", () => {
		it("uses WHATSNEW_CONFIG_DIR if set (absolute path)", () => {
			process.env.WHATSNEW_CONFIG_DIR = "/custom/config/path";
			expect(getConfigDir()).toBe("/custom/config/path");
		});

		it("resolves relative WHATSNEW_CONFIG_DIR against home directory", async () => {
			const os = await import("node:os");
			process.env.WHATSNEW_CONFIG_DIR = "relative/path";
			const expected = `${os.homedir()}/relative/path`;
			expect(getConfigDir()).toBe(expected);
		});

		it("uses XDG_CONFIG_HOME on non-Windows", async () => {
			process.env.WHATSNEW_CONFIG_DIR = undefined;
			process.env.XDG_CONFIG_HOME = "/custom/xdg";
			Object.defineProperty(process, "platform", { value: "linux" });

			// Re-import to pick up platform change
			const { getConfigDir: getConfigDirFresh } = await import(
				"../../src/config/paths.js"
			);
			expect(getConfigDirFresh()).toBe("/custom/xdg/whatsnew");
		});

		it("defaults to ~/.config/whatsnew when XDG_CONFIG_HOME not set", async () => {
			process.env.WHATSNEW_CONFIG_DIR = undefined;
			process.env.XDG_CONFIG_HOME = undefined;
			Object.defineProperty(process, "platform", { value: "darwin" });

			const os = await import("node:os");
			const { getConfigDir: getConfigDirFresh } = await import(
				"../../src/config/paths.js"
			);
			expect(getConfigDirFresh()).toBe(`${os.homedir()}/.config/whatsnew`);
		});
	});

	describe("getConfigPath", () => {
		it("returns config.json in config directory", () => {
			process.env.WHATSNEW_CONFIG_DIR = "/test/config";
			expect(getConfigPath()).toBe("/test/config/config.json");
		});
	});

	describe("getConfigPathDisplay", () => {
		it("returns Windows-style path on Windows", async () => {
			Object.defineProperty(process, "platform", { value: "win32" });

			const { getConfigPathDisplay: getConfigPathDisplayFresh } = await import(
				"../../src/config/paths.js"
			);
			expect(getConfigPathDisplayFresh()).toBe(
				"%APPDATA%\\whatsnew\\config.json",
			);
		});

		it("returns Unix-style path on non-Windows", async () => {
			Object.defineProperty(process, "platform", { value: "darwin" });

			const { getConfigPathDisplay: getConfigPathDisplayFresh } = await import(
				"../../src/config/paths.js"
			);
			expect(getConfigPathDisplayFresh()).toBe(
				"~/.config/whatsnew/config.json",
			);
		});
	});
});
