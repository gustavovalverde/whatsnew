/**
 * Test date range aggregation with vercel/ai SDK
 * Run with: GITHUB_TOKEN=your_token bun scripts/test-date-range.ts
 */

import { ReleaseService } from "../packages/core/src/services/release.service.js";

async function main() {
	const service = new ReleaseService({
		token: process.env.GITHUB_TOKEN,
	});

	console.log("╔════════════════════════════════════════════════════════════════╗");
	console.log("║       Testing Date Range Query: vercel/ai since Sept 1st       ║");
	console.log("╚════════════════════════════════════════════════════════════════╝\n");

	// Query: AI SDK releases since September 1st, only the main "ai" package
	const result = await service.getReleasesInRange("vercel", "ai", {
		since: "2025-09-01",
		// until defaults to now
		packageFilter: "ai@*", // Main ai package only (excludes @ai-sdk/* packages)
	});

	console.log(`📦 Repository: ${result.source.repo}`);
	console.log(`📅 Date Range: ${result.source.dateRange.since.split("T")[0]} → ${result.source.dateRange.until.split("T")[0]}`);
	console.log(`🏷️  Package Filter: ${result.source.packageFilter || "all"}`);
	console.log(`📊 Releases Found: ${result.releaseCount}`);
	console.log(`📝 Summary: ${result.summary}`);
	console.log(`⭐ Confidence: ${(result.confidence * 100).toFixed(0)}%\n`);

	console.log("═".repeat(66));
	console.log("\n📋 RELEASES INCLUDED:\n");

	for (const release of result.releases.slice(0, 10)) {
		console.log(`  • ${release.tag} (${release.releasedAt.split("T")[0]})`);
	}
	if (result.releases.length > 10) {
		console.log(`  ... and ${result.releases.length - 10} more`);
	}

	console.log("\n" + "═".repeat(66));
	console.log("\n📂 AGGREGATED CHANGES:\n");

	for (const category of result.categories) {
		console.log(`\n## ${category.title} (${category.items.length} items)\n`);
		for (const item of category.items.slice(0, 5)) {
			const refs = item.refs?.length ? ` (#${item.refs.join(", #")})` : "";
			console.log(`  - ${item.text.slice(0, 80)}${item.text.length > 80 ? "..." : ""}${refs}`);
		}
		if (category.items.length > 5) {
			console.log(`  ... and ${category.items.length - 5} more`);
		}
	}

	// Also output as JSON for inspection
	const outputPath = ".output/vercel-ai-date-range.json";
	const { writeFileSync, mkdirSync } = await import("fs");
	mkdirSync(".output", { recursive: true });
	writeFileSync(outputPath, JSON.stringify(result, null, 2));
	console.log(`\n\n✅ Full result saved to ${outputPath}`);
}

main().catch(console.error);
