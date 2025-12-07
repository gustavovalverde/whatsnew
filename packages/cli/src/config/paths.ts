/**
 * XDG-compliant configuration path resolution
 */

import * as os from "node:os";
import * as path from "node:path";

const CONFIG_DIR_NAME = "whatsnew";

/**
 * Ensure a path is absolute, resolving relative paths against home directory.
 * This prevents secrets from being written to CWD (which could be a git repo).
 */
function ensureAbsolutePath(p: string): string {
	if (path.isAbsolute(p)) {
		return p;
	}
	// Resolve relative paths against home directory, not CWD
	return path.join(os.homedir(), p);
}

/**
 * Get the configuration directory path following XDG Base Directory Specification
 *
 * Priority:
 * 1. WHATSNEW_CONFIG_DIR environment variable (explicit override)
 * 2. Platform-specific defaults:
 *    - Windows: %APPDATA%\whatsnew
 *    - macOS/Linux: $XDG_CONFIG_HOME/whatsnew (defaults to ~/.config/whatsnew)
 *
 * Security: All paths are resolved to absolute to prevent writing to CWD.
 */
export function getConfigDir(): string {
	// Allow explicit override
	if (process.env.WHATSNEW_CONFIG_DIR) {
		return ensureAbsolutePath(process.env.WHATSNEW_CONFIG_DIR);
	}

	// Windows: use APPDATA
	if (process.platform === "win32") {
		const appData = process.env.APPDATA;
		if (appData) {
			return ensureAbsolutePath(path.join(appData, CONFIG_DIR_NAME));
		}
		// Fallback to user profile
		return path.join(os.homedir(), "AppData", "Roaming", CONFIG_DIR_NAME);
	}

	// macOS/Linux: follow XDG specification
	const xdgConfigHome = process.env.XDG_CONFIG_HOME;
	if (xdgConfigHome) {
		return ensureAbsolutePath(path.join(xdgConfigHome, CONFIG_DIR_NAME));
	}
	return path.join(os.homedir(), ".config", CONFIG_DIR_NAME);
}

/**
 * Get the path to the configuration file
 */
export function getConfigPath(): string {
	return path.join(getConfigDir(), "config.json");
}

/**
 * Get a display-friendly config path for help text (platform-aware)
 */
export function getConfigPathDisplay(): string {
	if (process.platform === "win32") {
		return "%APPDATA%\\whatsnew\\config.json";
	}
	return "~/.config/whatsnew/config.json";
}
