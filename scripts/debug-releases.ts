/**
 * Debug releases fetching
 * Run with: GITHUB_TOKEN=your_token bun scripts/debug-releases.ts
 */

import { GitHubClient } from "../packages/core/src/integrations/github-client.js";

async function main() {
	const client = new GitHubClient({
		token: process.env.GITHUB_TOKEN,
	});

	console.log("Fetching vercel/ai releases...\n");

	const since = new Date("2025-09-01");
	const until = new Date();

	// Test without filter first
	console.log("1. Without package filter:");
	const allReleases = await client.getReleasesInRange("vercel", "ai", {
		since,
		until,
		maxPages: 2,
	});
	console.log(`   Found ${allReleases.length} releases`);
	console.log(`   Sample tags: ${allReleases.slice(0, 5).map(r => r.tag_name).join(", ")}`);

	// Test with filter
	console.log("\n2. With packageFilter 'ai@':");
	const filteredReleases = await client.getReleasesInRange("vercel", "ai", {
		since,
		until,
		packageFilter: "ai@",
		maxPages: 2,
	});
	console.log(`   Found ${filteredReleases.length} releases`);

	// Test with glob pattern
	console.log("\n3. With packageFilter 'ai@*':");
	const globReleases = await client.getReleasesInRange("vercel", "ai", {
		since,
		until,
		packageFilter: "ai@*",
		maxPages: 2,
	});
	console.log(`   Found ${globReleases.length} releases`);
	if (globReleases.length > 0) {
		console.log(`   Tags: ${globReleases.map(r => r.tag_name).join(", ")}`);
	}
}

main().catch(console.error);
