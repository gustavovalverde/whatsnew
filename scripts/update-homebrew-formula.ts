#!/usr/bin/env bun
/**
 * Update Homebrew formula with SHA256 checksums from a release.
 *
 * Usage:
 *   bun run scripts/update-homebrew-formula.ts <version>
 *
 * Example:
 *   bun run scripts/update-homebrew-formula.ts 0.1.3
 *
 * This script:
 * 1. Downloads the .sha256 files from the GitHub release
 * 2. Updates HomebrewFormula/whatsnew.rb with the checksums
 * 3. Updates the version in the formula
 */

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const REPO = "gustavovalverde/wnf";
const FORMULA_PATH = join(import.meta.dir, "../HomebrewFormula/whatsnew.rb");

const BINARIES = [
  { name: "whatsnew-darwin-arm64", placeholder: "PLACEHOLDER_DARWIN_ARM64_SHA256" },
  { name: "whatsnew-darwin-x64", placeholder: "PLACEHOLDER_DARWIN_X64_SHA256" },
  { name: "whatsnew-linux-arm64", placeholder: "PLACEHOLDER_LINUX_ARM64_SHA256" },
  { name: "whatsnew-linux-x64", placeholder: "PLACEHOLDER_LINUX_X64_SHA256" },
] as const;

async function fetchChecksum(version: string, binaryName: string): Promise<string> {
  // URL-encode the @ symbols in the tag
  const tag = encodeURIComponent(`@whatsnew/cli@${version}`);
  const url = `https://github.com/${REPO}/releases/download/${tag}/${binaryName}.sha256`;
  console.log(`Fetching ${url}...`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  const content = await response.text();
  // SHA256 file format: "hash  filename"
  const hash = content.trim().split(/\s+/)[0];

  if (!hash || !/^[a-f0-9]{64}$/i.test(hash)) {
    throw new Error(`Invalid checksum format in ${binaryName}.sha256: ${content}`);
  }

  return hash.toLowerCase();
}

async function updateFormula(version: string): Promise<void> {
  console.log(`\nUpdating Homebrew formula for version ${version}...\n`);

  // Read current formula
  let formula = await readFile(FORMULA_PATH, "utf-8");

  // Update version
  formula = formula.replace(/version "[\d.]+"/, `version "${version}"`);

  // Fetch and update checksums
  for (const { name, placeholder } of BINARIES) {
    try {
      const checksum = await fetchChecksum(version, name);
      console.log(`  ${name}: ${checksum}`);

      // Find the sha256 line after the url containing this binary name
      const binaryUrlPattern = new RegExp(
        `(url[^\\n]*${name.replace(/-/g, "\\-")}[^\\n]*\\n\\s*sha256 )"(?:[a-f0-9]{64}|PLACEHOLDER_[A-Z0-9_]+)"`
      );

      if (formula.includes(placeholder)) {
        formula = formula.replace(placeholder, checksum);
      } else {
        formula = formula.replace(binaryUrlPattern, `$1"${checksum}"`);
      }
    } catch (error) {
      console.error(`  ${name}: Failed - ${error}`);
      throw error;
    }
  }

  // Validate: no placeholders remaining
  if (formula.includes("PLACEHOLDER_")) {
    throw new Error("Formula still contains placeholder values after update");
  }

  // Validate: all SHA256 values are valid format
  const sha256Matches = formula.match(/sha256 "([^"]+)"/g);
  if (sha256Matches) {
    for (const match of sha256Matches) {
      const hash = match.replace(/sha256 "|"/g, "");
      if (!/^[a-f0-9]{64}$/.test(hash)) {
        throw new Error(`Invalid SHA256 found in formula: ${hash}`);
      }
    }
  }

  // Write updated formula
  await writeFile(FORMULA_PATH, formula);
  console.log(`\nFormula updated: ${FORMULA_PATH}`);
  console.log("Validation passed: All SHA256 values are valid");
}

// Main
const version = process.argv[2];

if (!version) {
  console.error("Usage: bun run scripts/update-homebrew-formula.ts <version>");
  console.error("Example: bun run scripts/update-homebrew-formula.ts 0.1.3");
  process.exit(1);
}

updateFormula(version).catch((error) => {
  console.error("\nError:", error.message);
  process.exit(1);
});
