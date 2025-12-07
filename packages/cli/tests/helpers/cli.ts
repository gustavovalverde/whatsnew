/**
 * CLI test helper for integration testing
 *
 * Spawns the CLI as a subprocess to test real-world behavior.
 * Uses Node's child_process.spawnSync for cross-runtime compatibility.
 */

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export interface CLIResult {
	/** Exit code (0 = success) */
	exitCode: number;
	/** stdout as string */
	stdout: string;
	/** stderr as string */
	stderr: string;
	/** Combined stdout + stderr */
	output: string;
	/** Whether command succeeded (exitCode === 0) */
	success: boolean;
}

export interface CLIOptions {
	/** Environment variables to set */
	env?: Record<string, string>;
	/** Working directory */
	cwd?: string;
	/** Timeout in milliseconds (default: 30000) */
	timeout?: number;
}

/** Get directory of this file (works in both Bun and Node/Vitest) */
const __dirname = dirname(fileURLToPath(import.meta.url));

/** Path to the compiled CLI binary */
const CLI_BIN = join(__dirname, "../../bin/whatsnew.js");

/** Path to the TypeScript source (for faster dev iteration) */
const CLI_TS = join(__dirname, "../../bin/whatsnew.ts");

/**
 * Run the CLI with given arguments
 *
 * @example
 * ```ts
 * const result = runCLI(["--help"]);
 * expect(result.success).toBe(true);
 * expect(result.stdout).toContain("whatsnew");
 * ```
 */
export function runCLI(args: string[], options: CLIOptions = {}): CLIResult {
	const { env = {}, cwd = process.cwd(), timeout = 30000 } = options;

	// Use bun to run the TypeScript source directly for faster iteration
	// This avoids needing to rebuild for every test
	const proc = spawnSync("bun", [CLI_TS, ...args], {
		cwd,
		env: {
			...process.env,
			// Disable colors for predictable output
			NO_COLOR: "1",
			// Override with test-specific env
			...env,
		},
		timeout,
		encoding: "utf-8",
	});

	const stdout = proc.stdout || "";
	const stderr = proc.stderr || "";

	return {
		exitCode: proc.status ?? 1,
		stdout,
		stderr,
		output: stdout + stderr,
		success: proc.status === 0,
	};
}

/**
 * Run the compiled CLI binary (for production-like testing)
 *
 * Use this when you need to test the actual bundled output.
 * Requires running `bun run build` first.
 */
export function runCLIBuilt(
	args: string[],
	options: CLIOptions = {},
): CLIResult {
	const { env = {}, cwd = process.cwd(), timeout = 30000 } = options;

	const proc = spawnSync("node", [CLI_BIN, ...args], {
		cwd,
		env: {
			...process.env,
			NO_COLOR: "1",
			...env,
		},
		timeout,
		encoding: "utf-8",
	});

	const stdout = proc.stdout || "";
	const stderr = proc.stderr || "";

	return {
		exitCode: proc.status ?? 1,
		stdout,
		stderr,
		output: stdout + stderr,
		success: proc.status === 0,
	};
}

/**
 * Create a temporary config directory for isolated testing
 *
 * Returns cleanup function to remove the directory after test.
 *
 * @example
 * ```ts
 * const { configDir, cleanup, env } = await createTempConfigDir();
 * try {
 *   const result = runCLI(["config", "list"], { env });
 *   // assertions...
 * } finally {
 *   await cleanup();
 * }
 * ```
 */
export async function createTempConfigDir(): Promise<{
	configDir: string;
	configPath: string;
	env: Record<string, string>;
	cleanup: () => Promise<void>;
}> {
	const { mkdtemp, rm } = await import("node:fs/promises");
	const { tmpdir } = await import("node:os");

	const configDir = await mkdtemp(join(tmpdir(), "whatsnew-test-"));
	const configPath = join(configDir, "config.json");

	return {
		configDir,
		configPath,
		env: {
			WHATSNEW_CONFIG_DIR: configDir,
			// Clear any existing tokens to isolate tests
			GITHUB_TOKEN: "",
			ANTHROPIC_API_KEY: "",
			OPENAI_API_KEY: "",
			AI_GATEWAY_API_KEY: "",
		},
		cleanup: async () => {
			await rm(configDir, { recursive: true, force: true });
		},
	};
}
