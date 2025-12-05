/**
 * User-friendly error messages
 */

import { colors } from "./colors.js";

export class CLIError extends Error {
	constructor(
		message: string,
		public readonly hint?: string,
	) {
		super(message);
		this.name = "CLIError";
	}
}

export function formatError(error: unknown): string {
	if (error instanceof CLIError) {
		let output = `${colors.red("Error:")} ${error.message}`;
		if (error.hint) {
			output += `\n\n${colors.dim(error.hint)}`;
		}
		return output;
	}

	if (error instanceof Error) {
		// Check for common error types
		if (error.message.includes("rate limit")) {
			return `${colors.red("Error:")} GitHub API rate limit exceeded.

${colors.dim(`Consider setting GITHUB_TOKEN for higher limits:
  export GITHUB_TOKEN=ghp_xxxx`)}`;
		}

		if (error.message.includes("Not Found") || error.message.includes("404")) {
			return `${colors.red("Error:")} Repository not found.

${colors.dim(`Check that the repository exists and is public, or set GITHUB_TOKEN for private repos.`)}`;
		}

		if (
			error.message.includes("ENOTFOUND") ||
			error.message.includes("network")
		) {
			return `${colors.red("Error:")} Unable to reach GitHub API.

${colors.dim(`Check your network connection and try again.`)}`;
		}

		return `${colors.red("Error:")} ${error.message}`;
	}

	return `${colors.red("Error:")} An unexpected error occurred.`;
}
