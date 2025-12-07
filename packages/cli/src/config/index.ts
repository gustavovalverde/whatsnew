/**
 * Configuration module exports
 */

export {
	ensureConfigDir,
	fixPermissions,
	hasInsecurePermissions,
	loadConfigFile,
	removeConfigValue,
	resolveConfig,
	saveConfigFile,
	updateConfigValue,
} from "./loader.js";
export { getConfigDir, getConfigPath, getConfigPathDisplay } from "./paths.js";
export {
	clearSensitiveEnvVars,
	detectProviderFromKey,
	isValidAnthropicKeyFormat,
	isValidGitHubTokenFormat,
	isValidOpenAIKeyFormat,
	maskToken,
	warnIfRoot,
} from "./security.js";
export type {
	AIConfig,
	ConfigFlags,
	ConfigSource,
	ResolvedConfig,
	WhatsnewConfig,
} from "./types.js";
