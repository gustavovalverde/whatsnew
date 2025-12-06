#!/usr/bin/env bun
/**
 * Publish script that resolves workspace:* dependencies before npm publish
 * This is needed because:
 * 1. bun publish doesn't support npm OIDC authentication
 * 2. changeset publish doesn't resolve workspace:* protocol
 * 3. npm publish works with OIDC but needs resolved versions
 */

import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";

// Packages to publish in dependency order
const PACKAGES = ["types", "parsers", "core", "cli"];

// Get the root directory
const ROOT = dirname(dirname(import.meta.url.replace("file://", "")));
const PACKAGES_DIR = join(ROOT, "packages");

interface PackageJson {
	name: string;
	version: string;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
}

function readPackageJson(pkgDir: string): PackageJson {
	const content = readFileSync(join(pkgDir, "package.json"), "utf-8");
	return JSON.parse(content);
}

function writePackageJson(pkgDir: string, pkg: PackageJson): void {
	writeFileSync(join(pkgDir, "package.json"), JSON.stringify(pkg, null, "\t") + "\n");
}

function getVersionMap(): Record<string, string> {
	const versions: Record<string, string> = {};
	for (const name of PACKAGES) {
		const pkg = readPackageJson(join(PACKAGES_DIR, name));
		versions[pkg.name] = pkg.version;
	}
	return versions;
}

function resolveWorkspaceDeps(deps: Record<string, string> | undefined, versions: Record<string, string>): Record<string, string> | undefined {
	if (!deps) return deps;

	const resolved: Record<string, string> = {};
	for (const [name, version] of Object.entries(deps)) {
		if (version === "workspace:*") {
			if (versions[name]) {
				resolved[name] = versions[name];
				console.log(`  Resolved ${name}: workspace:* -> ${versions[name]}`);
			} else {
				// Keep workspace:* for private packages (they won't be in npm anyway)
				resolved[name] = version;
			}
		} else {
			resolved[name] = version;
		}
	}
	return resolved;
}

function publishPackage(pkgName: string, versions: Record<string, string>): void {
	const pkgDir = join(PACKAGES_DIR, pkgName);
	const originalContent = readFileSync(join(pkgDir, "package.json"), "utf-8");
	const pkg = JSON.parse(originalContent) as PackageJson;

	console.log(`\nPublishing ${pkg.name}@${pkg.version}...`);

	try {
		// Resolve workspace dependencies
		pkg.dependencies = resolveWorkspaceDeps(pkg.dependencies, versions);
		pkg.devDependencies = resolveWorkspaceDeps(pkg.devDependencies, versions);

		// Write modified package.json
		writePackageJson(pkgDir, pkg);

		// Publish with npm (uses OIDC token from setup-node)
		execSync("npm publish --access public", {
			cwd: pkgDir,
			stdio: "inherit",
		});

		console.log(`✓ Published ${pkg.name}@${pkg.version}`);
	} finally {
		// Restore original package.json
		writeFileSync(join(pkgDir, "package.json"), originalContent);
	}
}

async function main(): Promise<void> {
	console.log("Building version map...");
	const versions = getVersionMap();
	console.log("Versions:", versions);

	for (const pkgName of PACKAGES) {
		publishPackage(pkgName, versions);
	}

	console.log("\n✓ All packages published successfully!");

	// Run changeset tag to create git tags
	console.log("\nCreating git tags...");
	execSync("bunx changeset tag", { stdio: "inherit" });
}

main().catch((err) => {
	console.error("Publish failed:", err);
	process.exit(1);
});
