/**
 * Configuration types for whatsnew CLI
 */

/**
 * AI provider configuration
 */
export interface AIConfig {
	/** AI provider: anthropic or openai */
	provider?: "anthropic" | "openai";
	/** API key for the AI provider */
	api_key?: string;
	/** Model to use (optional, uses provider default) */
	model?: string;
}

/**
 * Persisted configuration stored in config.json
 */
export interface WhatsnewConfig {
	/** GitHub personal access token */
	github_token?: string;
	/** AI configuration */
	ai?: AIConfig;
}

/**
 * Resolved configuration with values from all sources
 * (env vars, CLI flags, config file)
 */
export interface ResolvedConfig {
	/** GitHub token (from any source) */
	githubToken?: string;
	/** AI API key (from any source) */
	aiApiKey?: string;
	/** AI provider */
	aiProvider?: "anthropic" | "openai";
	/** AI model */
	aiModel?: string;
	/** Source of each config value for debugging */
	sources: {
		githubToken?: ConfigSource;
		aiApiKey?: ConfigSource;
		aiProvider?: ConfigSource;
	};
}

/**
 * Where a config value came from
 */
export type ConfigSource = "env" | "flag" | "config" | "default";

/**
 * CLI flags that can override config
 */
export interface ConfigFlags {
	githubToken?: string;
	aiKey?: string;
}
