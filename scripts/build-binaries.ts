#!/usr/bin/env bun
/**
 * Build binaries for multiple platforms using Bun's compile feature.
 *
 * Usage: bun run scripts/build-binaries.ts
 *
 * Outputs binaries to dist/binaries/
 */

import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

const TARGETS = [
  { target: "bun-linux-x64", output: "whatsnew-linux-x64" },
  { target: "bun-linux-arm64", output: "whatsnew-linux-arm64" },
  { target: "bun-darwin-x64", output: "whatsnew-darwin-x64" },
  { target: "bun-darwin-arm64", output: "whatsnew-darwin-arm64" },
  { target: "bun-windows-x64", output: "whatsnew-windows-x64.exe" },
] as const;

const ROOT_DIR = join(import.meta.dir, "..");
const CLI_ENTRY = join(ROOT_DIR, "packages/cli/bin/whatsnew.ts");
const OUTPUT_DIR = join(ROOT_DIR, "dist/binaries");

async function buildBinaries(): Promise<void> {
  console.log("Building binaries for all platforms...\n");

  // Clean and create output directory
  await rm(OUTPUT_DIR, { recursive: true, force: true });
  await mkdir(OUTPUT_DIR, { recursive: true });

  const results: { target: string; success: boolean; error?: string }[] = [];

  for (const { target, output } of TARGETS) {
    const outputPath = join(OUTPUT_DIR, output);
    console.log(`Building ${output}...`);

    const proc = Bun.spawn(
      ["bun", "build", "--compile", `--target=${target}`, CLI_ENTRY, "--outfile", outputPath],
      {
        cwd: ROOT_DIR,
        stdout: "pipe",
        stderr: "pipe",
      }
    );

    const exitCode = await proc.exited;

    if (exitCode === 0) {
      console.log(`  ✓ ${output}`);
      results.push({ target, success: true });
    } else {
      const stderr = await new Response(proc.stderr).text();
      console.error(`  ✗ ${output}: ${stderr.trim()}`);
      results.push({ target, success: false, error: stderr.trim() });
    }
  }

  console.log("\n--- Build Summary ---");
  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log(`Successful: ${successful.length}/${results.length}`);

  if (failed.length > 0) {
    console.log("\nFailed builds:");
    for (const { target, error } of failed) {
      console.log(`  - ${target}: ${error}`);
    }
    process.exit(1);
  }

  console.log(`\nBinaries written to: ${OUTPUT_DIR}`);
}

buildBinaries().catch((error) => {
  console.error("Build failed:", error);
  process.exit(1);
});
