/**
 * Configuration loader with permission handling
 */

import * as fs from "node:fs/promises";
import { getConfigDir, getConfigPath } from "./paths.js";
import type {
	ConfigFlags,
	ConfigSource,
	ResolvedConfig,
	WhatsnewConfig,
} from "./types.js";

/** Directory permissions: rwx for owner only */
const DIR_MODE = 0o700;
/** File permissions: rw for owner only */
const FILE_MODE = 0o600;

/**
 * Check if a path exists
 */
async function exists(path: string): Promise<boolean> {
	try {
		await fs.access(path);
		return true;
	} catch {
		return false;
	}
}

/**
 * Ensure config directory exists with proper permissions
 */
export async function ensureConfigDir(): Promise<void> {
	const configDir = getConfigDir();
	await fs.mkdir(configDir, { recursive: true, mode: DIR_MODE });

	// Explicitly set permissions (mkdir doesn't change perms if dir exists)
	if (process.platform !== "win32") {
		try {
			await fs.chmod(configDir, DIR_MODE);
		} catch {
			// Ignore chmod errors (might not own directory)
		}
	}
}

/**
 * Check if config file has insecure permissions
 * Returns true if file is readable by group or others
 */
export async function hasInsecurePermissions(
	filePath: string,
): Promise<boolean> {
	// Skip permission check on Windows (different permission model)
	if (process.platform === "win32") {
		return false;
	}

	try {
		const stats = await fs.stat(filePath);
		// Check if group or others have any permissions
		return (stats.mode & 0o077) !== 0;
	} catch {
		return false;
	}
}

/**
 * Fix permissions on config file
 */
export async function fixPermissions(filePath: string): Promise<void> {
	if (process.platform === "win32") {
		return; // Skip on Windows
	}
	await fs.chmod(filePath, FILE_MODE);
}

/**
 * Load configuration from file
 */
export async function loadConfigFile(): Promise<WhatsnewConfig> {
	const configPath = getConfigPath();

	if (!(await exists(configPath))) {
		return {};
	}

	// Check permissions
	if (await hasInsecurePermissions(configPath)) {
		console.warn(
			`Warning: Config file has insecure permissions. Run: chmod 600 ${configPath}`,
		);
	}

	try {
		const content = await fs.readFile(configPath, "utf-8");
		return JSON.parse(content) as WhatsnewConfig;
	} catch (error) {
		if (error instanceof SyntaxError) {
			console.warn(`Warning: Config file is not valid JSON: ${configPath}`);
		}
		return {};
	}
}

/**
 * Save configuration to file with secure permissions
 */
export async function saveConfigFile(config: WhatsnewConfig): Promise<void> {
	await ensureConfigDir();
	const configPath = getConfigPath();

	const content = JSON.stringify(config, null, 2);
	await fs.writeFile(configPath, content, { mode: FILE_MODE });

	// Explicitly set permissions (writeFile doesn't change perms if file exists)
	if (process.platform !== "win32") {
		try {
			await fs.chmod(configPath, FILE_MODE);
		} catch {
			// Ignore chmod errors (might not own file)
		}
	}
}

/**
 * Resolve configuration from all sources
 *
 * Priority (highest first):
 * 1. CLI flags (for one-off overrides)
 * 2. Environment variables (for CI/CD)
 * 3. Config file (persistent settings)
 */
export async function resolveConfig(
	flags: ConfigFlags = {},
): Promise<ResolvedConfig> {
	const fileConfig = await loadConfigFile();

	const sources: ResolvedConfig["sources"] = {};

	// Resolve GitHub token (flags > env > config)
	let githubToken: string | undefined;
	if (flags.githubToken) {
		githubToken = flags.githubToken;
		sources.githubToken = "flag";
	} else if (process.env.GITHUB_TOKEN) {
		githubToken = process.env.GITHUB_TOKEN;
		sources.githubToken = "env";
	} else if (fileConfig.github_token) {
		githubToken = fileConfig.github_token;
		sources.githubToken = "config";
	}

	// Resolve AI API key (flags > env > config)
	let aiApiKey: string | undefined;
	let aiApiKeySource: ConfigSource | undefined;

	// CLI flag takes priority
	if (flags.aiKey) {
		aiApiKey = flags.aiKey;
		aiApiKeySource = "flag";
	} else if (process.env.ANTHROPIC_API_KEY) {
		aiApiKey = process.env.ANTHROPIC_API_KEY;
		aiApiKeySource = "env";
	} else if (process.env.OPENAI_API_KEY) {
		aiApiKey = process.env.OPENAI_API_KEY;
		aiApiKeySource = "env";
	} else if (process.env.AI_GATEWAY_API_KEY) {
		aiApiKey = process.env.AI_GATEWAY_API_KEY;
		aiApiKeySource = "env";
	} else if (fileConfig.ai?.api_key) {
		aiApiKey = fileConfig.ai.api_key;
		aiApiKeySource = "config";
	}

	if (aiApiKeySource) {
		sources.aiApiKey = aiApiKeySource;
	}

	// Resolve AI provider
	let aiProvider: "anthropic" | "openai" | undefined;
	if (process.env.AI_PROVIDER === "openai") {
		aiProvider = "openai";
		sources.aiProvider = "env";
	} else if (process.env.AI_PROVIDER === "anthropic") {
		aiProvider = "anthropic";
		sources.aiProvider = "env";
	} else if (fileConfig.ai?.provider) {
		aiProvider = fileConfig.ai.provider;
		sources.aiProvider = "config";
	} else {
		aiProvider = "anthropic"; // default
		sources.aiProvider = "default";
	}

	return {
		githubToken,
		aiApiKey,
		aiProvider,
		aiModel: fileConfig.ai?.model,
		sources,
	};
}

/**
 * Update a specific config value
 */
export async function updateConfigValue(
	key: string,
	value: string,
): Promise<void> {
	const config = await loadConfigFile();

	// Handle nested keys like "ai.api_key"
	const parts = key.split(".");

	if (parts.length === 1) {
		// Top-level key
		(config as Record<string, unknown>)[key] = value;
	} else if (parts.length === 2 && parts[0] === "ai") {
		// AI nested key
		if (!config.ai) {
			config.ai = {};
		}
		const aiKey = parts[1] as keyof typeof config.ai;
		if (aiKey === "provider") {
			if (value !== "anthropic" && value !== "openai") {
				throw new Error(
					`Invalid provider: ${value}. Use 'anthropic' or 'openai'`,
				);
			}
			config.ai.provider = value;
		} else if (aiKey === "api_key" || aiKey === "model") {
			config.ai[aiKey] = value;
		} else {
			throw new Error(`Unknown AI config key: ${aiKey}`);
		}
	} else {
		throw new Error(`Unknown config key: ${key}`);
	}

	await saveConfigFile(config);
}

/**
 * Remove a config value by creating a new config without that key
 */
export async function removeConfigValue(key: string): Promise<void> {
	const config = await loadConfigFile();

	const parts = key.split(".");

	if (parts.length === 1) {
		// Create new config without the specified key
		const { [key]: _, ...rest } = config as Record<string, unknown>;
		await saveConfigFile(rest as WhatsnewConfig);
		return;
	}

	if (parts.length === 2 && parts[0] === "ai" && config.ai) {
		const aiKey = parts[1] as keyof typeof config.ai;
		// Create new ai config without the specified key
		const { [aiKey]: _, ...restAi } = config.ai;
		// If ai object is now empty, remove it entirely
		if (Object.keys(restAi).length === 0) {
			const { ai: __, ...restConfig } = config;
			await saveConfigFile(restConfig);
		} else {
			await saveConfigFile({ ...config, ai: restAi as typeof config.ai });
		}
		return;
	}

	await saveConfigFile(config);
}
