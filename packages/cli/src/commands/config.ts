/**
 * Config command implementation
 */

import {
	detectProviderFromKey,
	getConfigPath,
	isValidGitHubTokenFormat,
	loadConfigFile,
	maskToken,
	removeConfigValue,
	resolveConfig,
	updateConfigValue,
} from "../config/index.js";
import { colors } from "../utils/colors.js";
import { CLIError } from "../utils/errors.js";

const CONFIG_HELP = `
${colors.bold("whatsnew config")} - Manage configuration

${colors.bold("USAGE")}
  whatsnew config <command> [args]

${colors.bold("COMMANDS")}
  set <key> <value>    Set a configuration value
  unset <key>          Remove a configuration value
  list                 Show current configuration
  path                 Show configuration file path

${colors.bold("SET OPTIONS")}
  --skip-validation    Save token without validating (for offline use)

${colors.bold("KEYS")}
  github_token         GitHub personal access token
  ai.api_key           AI provider API key (Anthropic or OpenAI)
  ai.provider          AI provider: anthropic or openai

${colors.bold("EXAMPLES")}
  whatsnew config set github_token ghp_xxxxxxxxxxxx
  whatsnew config set ai.api_key sk-ant-xxxxxxxxxxxx
  whatsnew config set ai.provider openai
  whatsnew config set github_token ghp_xxx --skip-validation
  whatsnew config list
  whatsnew config unset github_token
`;

/**
 * Validate a GitHub token by calling the API
 */
async function validateGitHubToken(
	token: string,
): Promise<{ valid: boolean; user?: string; error?: string }> {
	try {
		const response = await fetch("https://api.github.com/user", {
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: "application/vnd.github+json",
				"X-GitHub-Api-Version": "2022-11-28",
			},
		});

		if (response.ok) {
			const data = (await response.json()) as { login: string };
			return { valid: true, user: data.login };
		}

		if (response.status === 401) {
			return { valid: false, error: "Invalid or expired token" };
		}

		return { valid: false, error: `API error: ${response.status}` };
	} catch (error) {
		return {
			valid: false,
			error: error instanceof Error ? error.message : "Network error",
		};
	}
}

/**
 * Run the config command
 */
export async function runConfigCommand(args: string[]): Promise<void> {
	const subcommand = args[0];

	if (!subcommand || subcommand === "help" || subcommand === "--help") {
		console.log(CONFIG_HELP);
		return;
	}

	switch (subcommand) {
		case "set":
			await handleSet(args.slice(1));
			break;
		case "unset":
			await handleUnset(args.slice(1));
			break;
		case "list":
			await handleList();
			break;
		case "path":
			handlePath();
			break;
		default:
			throw new CLIError(
				`Unknown config command: ${subcommand}`,
				"Run 'whatsnew config --help' for usage",
			);
	}
}

/**
 * Parse config set arguments, extracting flags
 */
function parseSetArgs(args: string[]): {
	key: string;
	value: string;
	skipValidation: boolean;
} {
	let skipValidation = false;
	const filteredArgs: string[] = [];

	for (const arg of args) {
		if (arg === "--skip-validation") {
			skipValidation = true;
		} else {
			filteredArgs.push(arg);
		}
	}

	const [key, ...valueParts] = filteredArgs;
	const value = valueParts.join(" ");

	return { key: key || "", value, skipValidation };
}

/**
 * Handle 'config set' command
 */
async function handleSet(args: string[]): Promise<void> {
	const { key, value, skipValidation } = parseSetArgs(args);

	if (!key || !value) {
		throw new CLIError(
			"Missing key or value",
			"Usage: whatsnew config set <key> <value> [--skip-validation]",
		);
	}

	// Validate based on key type
	if (key === "github_token") {
		// Check format
		if (!isValidGitHubTokenFormat(value)) {
			console.log(
				colors.yellow(
					"Warning: Token format doesn't match known GitHub token prefixes",
				),
			);
		}

		// Validate with API (unless skipped)
		if (skipValidation) {
			console.log(colors.dim("Skipping validation"));
		} else {
			process.stdout.write("Validating token... ");
			const result = await validateGitHubToken(value);

			if (result.valid) {
				console.log(colors.green(`Valid (user: ${result.user})`));
			} else {
				console.log(colors.red(`Invalid: ${result.error}`));
				throw new CLIError(
					"Token validation failed",
					"Please check your token and try again. Use --skip-validation to bypass.",
				);
			}
		}
	} else if (key === "ai.api_key") {
		const provider = detectProviderFromKey(value);
		if (provider) {
			console.log(
				colors.dim(`Detected provider: ${provider} (based on key format)`),
			);
		} else {
			console.log(
				colors.yellow("Warning: Could not detect provider from key format"),
			);
		}
	} else if (key === "ai.provider") {
		if (value !== "anthropic" && value !== "openai") {
			throw new CLIError(
				`Invalid provider: ${value}`,
				"Valid providers are: anthropic, openai",
			);
		}
	}

	await updateConfigValue(key, value);
	console.log(`Config saved to ${getConfigPath()}`);
}

/**
 * Handle 'config unset' command
 */
async function handleUnset(args: string[]): Promise<void> {
	const [key] = args;

	if (!key) {
		throw new CLIError("Missing key", "Usage: whatsnew config unset <key>");
	}

	await removeConfigValue(key);
	console.log(`Removed '${key}' from config`);
}

/**
 * Handle 'config list' command
 */
async function handleList(): Promise<void> {
	const resolved = await resolveConfig();
	const fileConfig = await loadConfigFile();

	console.log(colors.bold("\nConfiguration:"));
	console.log();

	// GitHub token
	const ghStatus = resolved.githubToken
		? colors.green("(set)")
		: colors.dim("(not set)");
	const ghSource = resolved.sources.githubToken
		? colors.dim(` [${resolved.sources.githubToken}]`)
		: "";
	console.log(
		`  github_token:  ${maskToken(resolved.githubToken)} ${ghStatus}${ghSource}`,
	);

	// AI provider
	const providerSource = resolved.sources.aiProvider
		? colors.dim(` [${resolved.sources.aiProvider}]`)
		: "";
	console.log(
		`  ai.provider:   ${resolved.aiProvider || "anthropic"}${providerSource}`,
	);

	// AI API key
	const aiStatus = resolved.aiApiKey
		? colors.green("(set)")
		: colors.dim("(not set)");
	const aiSource = resolved.sources.aiApiKey
		? colors.dim(` [${resolved.sources.aiApiKey}]`)
		: "";
	console.log(
		`  ai.api_key:    ${maskToken(resolved.aiApiKey)} ${aiStatus}${aiSource}`,
	);

	// AI model (if set)
	if (fileConfig.ai?.model) {
		console.log(`  ai.model:      ${fileConfig.ai.model}`);
	}

	console.log();
	console.log(colors.dim(`Config file: ${getConfigPath()}`));
	console.log();
}

/**
 * Handle 'config path' command
 */
function handlePath(): void {
	console.log(getConfigPath());
}
