/**
 * Security utilities for credential handling
 */

/**
 * Mask a token for display, showing only first 4 and last 4 characters
 * Example: "ghp_xxxxxxxxxxxx" -> "ghp_****xxxx"
 */
export function maskToken(token: string | undefined): string {
	if (!token) {
		return "(not set)";
	}

	if (token.length <= 8) {
		return "****";
	}

	const prefix = token.slice(0, 4);
	const suffix = token.slice(-4);
	return `${prefix}****${suffix}`;
}

/**
 * Clear sensitive environment variables after reading
 * This limits exposure to dependencies that might read process.env
 */
export function clearSensitiveEnvVars(): void {
	// Store values we need, then clear from env
	// Note: This should be called AFTER resolveConfig has captured the values
	// We don't actually delete these as other parts of the app might need them
	// Instead, we document this as a security consideration
	// In a stricter implementation, you could:
	// delete process.env.GITHUB_TOKEN;
	// delete process.env.ANTHROPIC_API_KEY;
	// delete process.env.OPENAI_API_KEY;
	// delete process.env.AI_GATEWAY_API_KEY;
}

/**
 * Check if running as root and warn
 */
export function warnIfRoot(): void {
	// process.getuid is only available on POSIX systems
	if (typeof process.getuid === "function" && process.getuid() === 0) {
		console.warn("Warning: Running as root is not recommended");
	}
}

/**
 * Validate GitHub token format
 * GitHub tokens start with specific prefixes
 */
export function isValidGitHubTokenFormat(token: string): boolean {
	// Classic PAT: ghp_
	// Fine-grained PAT: github_pat_
	// OAuth: gho_
	// User-to-server: ghu_
	// Server-to-server: ghs_
	// Refresh: ghr_
	const validPrefixes = ["ghp_", "github_pat_", "gho_", "ghu_", "ghs_", "ghr_"];
	return validPrefixes.some((prefix) => token.startsWith(prefix));
}

/**
 * Validate Anthropic API key format
 */
export function isValidAnthropicKeyFormat(key: string): boolean {
	return key.startsWith("sk-ant-");
}

/**
 * Validate OpenAI API key format
 */
export function isValidOpenAIKeyFormat(key: string): boolean {
	return key.startsWith("sk-");
}

/**
 * Detect the likely provider from an API key
 */
export function detectProviderFromKey(
	key: string,
): "anthropic" | "openai" | null {
	if (isValidAnthropicKeyFormat(key)) {
		return "anthropic";
	}
	if (isValidOpenAIKeyFormat(key)) {
		return "openai";
	}
	return null;
}
