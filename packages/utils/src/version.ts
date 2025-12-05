/**
 * Version extraction utilities
 *
 * These functions extract version numbers and package names from git tags.
 */

/**
 * Extracts the version number from a git tag
 *
 * Handles common tag formats:
 * - `v1.2.3` → `1.2.3` (strips v prefix)
 * - `@scope/package@1.2.3` → `1.2.3` (strips scoped package prefix)
 * - `package@1.2.3` → `1.2.3` (strips package prefix)
 * - `1.2.3` → `1.2.3` (unchanged)
 *
 * @example
 * ```typescript
 * extractVersion("v1.2.3");           // "1.2.3"
 * extractVersion("@scope/pkg@1.2.3"); // "1.2.3"
 * extractVersion("pkg@1.2.3");        // "1.2.3"
 * ```
 */
export function extractVersion(tagName: string): string {
	return tagName
		.replace(/^v/, "") // Strip leading 'v'
		.replace(/^@?[^@]+@/, ""); // Strip package prefix (scoped or unscoped)
}

/**
 * Extracts the package name from a monorepo-style git tag
 *
 * Returns the package name if the tag follows monorepo conventions,
 * or null if it's a simple version tag.
 *
 * Handles formats:
 * - `@scope/package@1.2.3` → `@scope/package`
 * - `package@1.2.3` → `package`
 * - `v1.2.3` → `null`
 * - `1.2.3` → `null`
 *
 * @example
 * ```typescript
 * extractPackageName("@scope/pkg@1.2.3"); // "@scope/pkg"
 * extractPackageName("pkg@1.2.3");        // "pkg"
 * extractPackageName("v1.2.3");           // null
 * ```
 */
export function extractPackageName(tagName: string): string | null {
	const match = tagName.match(/^(@?[^@]+)@/);
	return match?.[1] ?? null;
}

/**
 * Checks if a tag follows monorepo naming convention
 *
 * Monorepo tags typically have format: `package@version` or `@scope/package@version`
 *
 * @example
 * ```typescript
 * isMonorepoTag("@whatsnew/core@1.0.0"); // true
 * isMonorepoTag("v1.0.0");               // false
 * ```
 */
export function isMonorepoTag(tagName: string): boolean {
	return extractPackageName(tagName) !== null;
}

/**
 * Parses a semver-style version string into components
 *
 * @returns Object with major, minor, patch, and optional prerelease
 * @returns null if the version string is invalid
 *
 * @example
 * ```typescript
 * parseVersion("1.2.3");       // { major: 1, minor: 2, patch: 3 }
 * parseVersion("1.2.3-beta");  // { major: 1, minor: 2, patch: 3, prerelease: "beta" }
 * parseVersion("invalid");     // null
 * ```
 */
export function parseVersion(version: string): {
	major: number;
	minor: number;
	patch: number;
	prerelease?: string;
} | null {
	const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
	if (!match) return null;

	return {
		major: Number.parseInt(match[1], 10),
		minor: Number.parseInt(match[2], 10),
		patch: Number.parseInt(match[3], 10),
		prerelease: match[4],
	};
}
