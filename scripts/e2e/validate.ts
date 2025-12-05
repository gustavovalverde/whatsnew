#!/usr/bin/env bun
/**
 * E2E Validation Script
 *
 * Runs the WNF pipeline against test repositories and outputs results
 * for manual or automated validation.
 *
 * Usage:
 *   bun run scripts/e2e/validate.ts                    # Run all
 *   bun run scripts/e2e/validate.ts --category AI/ML   # Filter by category
 *   bun run scripts/e2e/validate.ts --limit 5          # Limit count
 *   bun run scripts/e2e/validate.ts --repo vercel/ai   # Single repo
 */

import { ReleaseService } from "../../packages/core/src/services/release.service.js";
import { GitHubClient } from "../../packages/core/src/integrations/github-client.js";
import type { WNFDocument } from "../../packages/types/src/index.js";
import {
	TEST_REPOSITORIES,
	type TestRepository,
	getByCategory,
	REPOSITORY_COUNT,
} from "./test-repositories.js";

// =============================================================================
// Configuration
// =============================================================================

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OUTPUT_DIR = "./scripts/e2e/results";

interface ValidationResult {
	repo: TestRepository;
	success: boolean;
	document?: WNFDocument;
	error?: string;
	duration: number;
	detectedFormat?: string;
	categoryCount: number;
	itemCount: number;
	confidence: number;
}

// =============================================================================
// CLI Argument Parsing
// =============================================================================

function parseArgs(): {
	category?: string;
	limit?: number;
	repo?: string;
	verbose: boolean;
	saveResults: boolean;
} {
	const args = process.argv.slice(2);
	const result = {
		category: undefined as string | undefined,
		limit: undefined as number | undefined,
		repo: undefined as string | undefined,
		verbose: false,
		saveResults: true,
	};

	for (let i = 0; i < args.length; i++) {
		switch (args[i]) {
			case "--category":
			case "-c":
				result.category = args[++i];
				break;
			case "--limit":
			case "-l":
				result.limit = Number.parseInt(args[++i], 10);
				break;
			case "--repo":
			case "-r":
				result.repo = args[++i];
				break;
			case "--verbose":
			case "-v":
				result.verbose = true;
				break;
			case "--no-save":
				result.saveResults = false;
				break;
		}
	}

	return result;
}

// =============================================================================
// Validation Logic
// =============================================================================

async function validateRepository(
	repo: TestRepository,
	service: ReleaseService,
	verbose: boolean,
): Promise<ValidationResult> {
	const start = Date.now();

	try {
		if (verbose) {
			console.log(`  Fetching ${repo.platform}/${repo.owner}/${repo.repo}...`);
		}

		// Only GitHub is fully implemented for now
		if (repo.platform !== "github") {
			return {
				repo,
				success: false,
				error: "GitLab support not yet implemented in e2e runner",
				duration: Date.now() - start,
				categoryCount: 0,
				itemCount: 0,
				confidence: 0,
			};
		}

		const document = await service.getLatestReleaseWNF(
			repo.owner,
			repo.repo,
			repo.packageFilter,
		);

		const duration = Date.now() - start;
		const categoryCount = document.categories.length;
		const itemCount = document.categories.reduce(
			(sum, cat) => sum + cat.items.length,
			0,
		);

		return {
			repo,
			success: true,
			document,
			duration,
			detectedFormat: document.generatedFrom[0],
			categoryCount,
			itemCount,
			confidence: document.confidence,
		};
	} catch (error) {
		return {
			repo,
			success: false,
			error: error instanceof Error ? error.message : String(error),
			duration: Date.now() - start,
			categoryCount: 0,
			itemCount: 0,
			confidence: 0,
		};
	}
}

// =============================================================================
// Output Formatting
// =============================================================================

function formatResult(result: ValidationResult, verbose: boolean): string {
	const status = result.success ? "✓" : "✗";
	const repoId = `${result.repo.owner}/${result.repo.repo}`;
	const duration = `${result.duration}ms`;

	if (!result.success) {
		return `${status} ${repoId} - FAILED: ${result.error} (${duration})`;
	}

	const summary = [
		`${result.categoryCount} categories`,
		`${result.itemCount} items`,
		`${(result.confidence * 100).toFixed(0)}% confidence`,
	].join(", ");

	let output = `${status} ${repoId} - ${summary} (${duration})`;

	if (verbose && result.document) {
		output += "\n";
		output += `    Version: ${result.document.version || "N/A"}\n`;
		output += `    Source: ${result.document.generatedFrom.join(", ")}\n`;
		output += `    Categories:\n`;
		for (const cat of result.document.categories) {
			output += `      - ${cat.title}: ${cat.items.length} items\n`;
		}
	}

	return output;
}

function printSummary(results: ValidationResult[]): void {
	const successful = results.filter((r) => r.success);
	const failed = results.filter((r) => !r.success);

	console.log("\n" + "=".repeat(70));
	console.log("SUMMARY");
	console.log("=".repeat(70));
	console.log(`Total: ${results.length} repositories`);
	console.log(`Successful: ${successful.length}`);
	console.log(`Failed: ${failed.length}`);

	if (successful.length > 0) {
		const avgConfidence =
			successful.reduce((sum, r) => sum + r.confidence, 0) / successful.length;
		const avgItems =
			successful.reduce((sum, r) => sum + r.itemCount, 0) / successful.length;
		const avgDuration =
			successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;

		console.log(`\nSuccessful Results:`);
		console.log(`  Avg Confidence: ${(avgConfidence * 100).toFixed(1)}%`);
		console.log(`  Avg Items: ${avgItems.toFixed(1)}`);
		console.log(`  Avg Duration: ${avgDuration.toFixed(0)}ms`);
	}

	if (failed.length > 0) {
		console.log(`\nFailed Repositories:`);
		for (const result of failed) {
			console.log(`  - ${result.repo.owner}/${result.repo.repo}: ${result.error}`);
		}
	}
}

// =============================================================================
// File Output
// =============================================================================

async function saveResults(
	results: ValidationResult[],
	outputDir: string,
): Promise<void> {
	const fs = await import("node:fs/promises");
	const path = await import("node:path");

	await fs.mkdir(outputDir, { recursive: true });

	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	const filename = path.join(outputDir, `validation-${timestamp}.json`);

	// Create a serializable version (without circular refs)
	const output = {
		timestamp: new Date().toISOString(),
		totalRepositories: results.length,
		successful: results.filter((r) => r.success).length,
		failed: results.filter((r) => !r.success).length,
		results: results.map((r) => ({
			repository: `${r.repo.platform}/${r.repo.owner}/${r.repo.repo}`,
			category: r.repo.category,
			expectedFormat: r.repo.expectedFormat,
			success: r.success,
			error: r.error,
			duration: r.duration,
			detectedFormat: r.detectedFormat,
			categoryCount: r.categoryCount,
			itemCount: r.itemCount,
			confidence: r.confidence,
			document: r.document,
		})),
	};

	await fs.writeFile(filename, JSON.stringify(output, null, 2));
	console.log(`\nResults saved to: ${filename}`);
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
	const args = parseArgs();

	console.log("WNF E2E Validation");
	console.log("=".repeat(70));

	// Check for GitHub token
	if (!GITHUB_TOKEN) {
		console.error("Error: GITHUB_TOKEN environment variable is required");
		console.error("Set it with: export GITHUB_TOKEN=your_token");
		process.exit(1);
	}

	// Filter repositories
	let repos: TestRepository[] = TEST_REPOSITORIES;

	if (args.repo) {
		const [owner, repoName] = args.repo.split("/");
		repos = repos.filter((r) => r.owner === owner && r.repo === repoName);
		if (repos.length === 0) {
			console.error(`Repository not found: ${args.repo}`);
			console.error("Available repositories:");
			for (const r of TEST_REPOSITORIES.slice(0, 5)) {
				console.error(`  - ${r.owner}/${r.repo}`);
			}
			process.exit(1);
		}
	} else if (args.category) {
		repos = getByCategory(args.category);
		if (repos.length === 0) {
			console.error(`No repositories found for category: ${args.category}`);
			process.exit(1);
		}
	}

	if (args.limit && args.limit < repos.length) {
		repos = repos.slice(0, args.limit);
	}

	console.log(`Testing ${repos.length} of ${REPOSITORY_COUNT} repositories\n`);

	// Initialize service
	const github = new GitHubClient({ token: GITHUB_TOKEN });
	const service = new ReleaseService({ github });

	// Run validation
	const results: ValidationResult[] = [];

	for (const repo of repos) {
		const result = await validateRepository(repo, service, args.verbose);
		results.push(result);
		console.log(formatResult(result, args.verbose));
	}

	// Print summary
	printSummary(results);

	// Save results
	if (args.saveResults) {
		await saveResults(results, OUTPUT_DIR);
	}

	// Exit with error code if any failures
	const hasFailures = results.some((r) => !r.success);
	process.exit(hasFailures ? 1 : 0);
}

main().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
