/**
 * Test intelligent category inference across multiple repositories
 * Run with: GITHUB_TOKEN=your_token bun scripts/test-categorization.ts
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { ReleaseService } from "../packages/core/src/services/release.service.js";

interface TestRepo {
	owner: string;
	repo: string;
	description: string;
}

const TEST_REPOS: TestRepo[] = [
	{ owner: "vercel", repo: "ai", description: "AI SDK - Changesets format" },
	{ owner: "nestjs", repo: "nest", description: "NestJS - GitHub auto-generated" },
	{ owner: "expressjs", repo: "express", description: "Express - Keep-a-Changelog style" },
	{ owner: "prisma", repo: "prisma", description: "Prisma - Mixed format" },
	{ owner: "facebook", repo: "react", description: "React - GitHub releases" },
];

async function main() {
	const service = new ReleaseService({
		token: process.env.GITHUB_TOKEN,
		// Note: enableFallback uses DataAggregator which has a different code path
		// The recategorization is applied in parseReleaseBody which runs without fallback
		enableFallback: false,
	});

	mkdirSync(".output/categorization-tests", { recursive: true });

	console.log("╔════════════════════════════════════════════════════════════════╗");
	console.log("║     Testing Intelligent Category Inference - 5 Repositories    ║");
	console.log("╚════════════════════════════════════════════════════════════════╝\n");

	const results: Record<string, unknown> = {};

	for (const { owner, repo, description } of TEST_REPOS) {
		console.log(`\n${"═".repeat(66)}`);
		console.log(`📦 Testing: ${owner}/${repo}`);
		console.log(`   ${description}`);
		console.log("═".repeat(66));

		try {
			// Get the latest release
			const latestRelease = await service.getLatestReleaseWNF(owner, repo);

			if (latestRelease) {
				console.log(`\n✅ Latest Release: ${latestRelease.version}`);
				console.log(`   Published: ${latestRelease.releasedAt?.split("T")[0] || "unknown"}`);
				console.log(`   Format: ${latestRelease.source.format}`);
				console.log(`   Confidence: ${(latestRelease.confidence * 100).toFixed(0)}%`);

				// Show category breakdown
				console.log("\n   Categories:");
				for (const cat of latestRelease.categories) {
					console.log(`     • ${cat.title}: ${cat.items.length} items`);
				}

				// Save individual result
				const outputPath = `.output/categorization-tests/${owner}-${repo}-latest.json`;
				writeFileSync(outputPath, JSON.stringify(latestRelease, null, 2));
				console.log(`\n   💾 Saved to: ${outputPath}`);

				results[`${owner}/${repo}`] = {
					version: latestRelease.version,
					format: latestRelease.source.format,
					confidence: latestRelease.confidence,
					categories: latestRelease.categories.map((c) => ({
						id: c.id,
						title: c.title,
						count: c.items.length,
					})),
				};
			} else {
				console.log("\n❌ No release found");
				results[`${owner}/${repo}`] = { error: "No release found" };
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.log(`\n❌ Error: ${errorMessage}`);
			results[`${owner}/${repo}`] = { error: errorMessage };
		}
	}

	// Save summary
	console.log("\n\n" + "═".repeat(66));
	console.log("📊 SUMMARY");
	console.log("═".repeat(66));

	const summaryPath = ".output/categorization-tests/summary.json";
	writeFileSync(summaryPath, JSON.stringify(results, null, 2));
	console.log(`\n💾 Summary saved to: ${summaryPath}`);

	// Print summary table
	console.log("\n┌────────────────────┬────────────────┬────────────────────────────────────┐");
	console.log("│ Repository         │ Format         │ Categories                         │");
	console.log("├────────────────────┼────────────────┼────────────────────────────────────┤");

	for (const [repoName, data] of Object.entries(results)) {
		const d = data as { format?: string; categories?: Array<{ id: string; count: number }> };
		const format = d.format || "N/A";
		const cats = d.categories
			? d.categories.map((c) => `${c.id}:${c.count}`).join(", ")
			: "error";
		console.log(
			`│ ${repoName.padEnd(18)} │ ${format.padEnd(14)} │ ${cats.slice(0, 34).padEnd(34)} │`,
		);
	}

	console.log("└────────────────────┴────────────────┴────────────────────────────────────┘");
}

main().catch(console.error);
