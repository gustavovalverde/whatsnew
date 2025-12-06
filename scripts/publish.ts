#!/usr/bin/env bun
/**
 * Publish script that resolves workspace:* and catalog: dependencies before npm publish
 * This is needed because:
 * 1. bun publish doesn't support npm OIDC authentication
 * 2. changeset publish doesn't resolve workspace:* protocol
 * 3. npm publish works with OIDC but needs resolved versions
 */

import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";

// Packages to publish in dependency order (utils first, then types, etc.)
const PACKAGES = ["utils", "types", "parsers", "core", "cli"];

// Get the root directory
const ROOT = dirname(dirname(import.meta.url.replace("file://", "")));
const PACKAGES_DIR = join(ROOT, "packages");

interface PackageJson {
	name: string;
	version: string;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
}

interface RootPackageJson {
	catalog?: Record<string, string>;
}

function readPackageJson(pkgDir: string): PackageJson {
	const content = readFileSync(join(pkgDir, "package.json"), "utf-8");
	return JSON.parse(content);
}

function readRootPackageJson(): RootPackageJson {
	const content = readFileSync(join(ROOT, "package.json"), "utf-8");
	return JSON.parse(content);
}

function writePackageJson(pkgDir: string, pkg: PackageJson): void {
	writeFileSync(
		join(pkgDir, "package.json"),
		JSON.stringify(pkg, null, "\t") + "\n",
	);
}

function getVersionMap(): Record<string, string> {
	const versions: Record<string, string> = {};
	for (const name of PACKAGES) {
		const pkg = readPackageJson(join(PACKAGES_DIR, name));
		versions[pkg.name] = pkg.version;
	}
	return versions;
}

function getCatalog(): Record<string, string> {
	const root = readRootPackageJson();
	return root.catalog || {};
}

function isVersionPublished(name: string, version: string): boolean {
	try {
		execSync(`npm view ${name}@${version} version`, { stdio: "pipe" });
		return true;
	} catch {
		return false;
	}
}

function resolveDeps(
	deps: Record<string, string> | undefined,
	versions: Record<string, string>,
	catalog: Record<string, string>,
): Record<string, string> | undefined {
	if (!deps) return deps;

	const resolved: Record<string, string> = {};
	for (const [name, version] of Object.entries(deps)) {
		if (version === "workspace:*") {
			if (versions[name]) {
				resolved[name] = versions[name];
				console.log(`  Resolved ${name}: workspace:* -> ${versions[name]}`);
			} else {
				// Skip private packages that aren't being published
				console.log(
					`  Warning: ${name} has workspace:* but is not in publish list, keeping as-is`,
				);
				resolved[name] = version;
			}
		} else if (version === "catalog:" || version.startsWith("catalog:")) {
			// Resolve catalog: references
			const catalogVersion = catalog[name];
			if (catalogVersion) {
				resolved[name] = catalogVersion;
				console.log(`  Resolved ${name}: ${version} -> ${catalogVersion}`);
			} else {
				console.log(
					`  Warning: ${name} has ${version} but not found in catalog, keeping as-is`,
				);
				resolved[name] = version;
			}
		} else {
			resolved[name] = version;
		}
	}
	return resolved;
}

function publishPackage(
	pkgName: string,
	versions: Record<string, string>,
	catalog: Record<string, string>,
): { success: boolean; skipped: boolean } {
	const pkgDir = join(PACKAGES_DIR, pkgName);
	const originalContent = readFileSync(join(pkgDir, "package.json"), "utf-8");
	const pkg = JSON.parse(originalContent) as PackageJson;

	console.log(`\nPublishing ${pkg.name}@${pkg.version}...`);

	// Check if version already exists on npm
	if (isVersionPublished(pkg.name, pkg.version)) {
		console.log(`⏭️  Skipped ${pkg.name}@${pkg.version} (already published)`);
		return { success: true, skipped: true };
	}

	try {
		// Resolve workspace and catalog dependencies
		pkg.dependencies = resolveDeps(pkg.dependencies, versions, catalog);
		// Note: devDependencies are not included in published package, but resolve anyway for consistency
		pkg.devDependencies = resolveDeps(pkg.devDependencies, versions, catalog);

		// Write modified package.json
		writePackageJson(pkgDir, pkg);

		// Publish with npm (uses OIDC token from setup-node)
		execSync("npm publish --access public", {
			cwd: pkgDir,
			stdio: "inherit",
		});

		console.log(`✓ Published ${pkg.name}@${pkg.version}`);
		return { success: true, skipped: false };
	} catch (error) {
		console.error(`✗ Failed to publish ${pkg.name}@${pkg.version}`);
		return { success: false, skipped: false };
	} finally {
		// Restore original package.json
		writeFileSync(join(pkgDir, "package.json"), originalContent);
	}
}

async function main(): Promise<void> {
	console.log("Building version map...");
	const versions = getVersionMap();
	console.log("Versions:", versions);

	console.log("\nLoading catalog...");
	const catalog = getCatalog();
	console.log("Catalog entries:", Object.keys(catalog).length);

	const results: { name: string; success: boolean; skipped: boolean }[] = [];

	for (const pkgName of PACKAGES) {
		const result = publishPackage(pkgName, versions, catalog);
		const pkg = readPackageJson(join(PACKAGES_DIR, pkgName));
		results.push({ name: pkg.name, ...result });
	}

	// Summary
	console.log("\n=== Publish Summary ===");
	const published = results.filter((r) => r.success && !r.skipped);
	const skipped = results.filter((r) => r.skipped);
	const failed = results.filter((r) => !r.success);

	if (published.length > 0) {
		console.log(`✓ Published: ${published.map((r) => r.name).join(", ")}`);
	}
	if (skipped.length > 0) {
		console.log(`⏭️  Skipped: ${skipped.map((r) => r.name).join(", ")}`);
	}
	if (failed.length > 0) {
		console.log(`✗ Failed: ${failed.map((r) => r.name).join(", ")}`);
	}

	// Only fail if there were actual failures (not just skips)
	if (failed.length > 0) {
		console.error(
			`\n${failed.length} package(s) failed to publish. Please check the errors above.`,
		);
		process.exit(1);
	}

	if (published.length > 0) {
		// Run changeset tag to create git tags
		console.log("\nCreating git tags...");
		try {
			execSync("bunx changeset tag", { stdio: "inherit" });
		} catch {
			console.log("Note: changeset tag failed (may already exist)");
		}
	}

	console.log("\n✓ Done!");
}

main().catch((err) => {
	console.error("Publish failed:", err);
	process.exit(1);
});
