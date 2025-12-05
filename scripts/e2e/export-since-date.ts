#!/usr/bin/env bun
/**
 * Export releases since a specific date for comparison
 */

import { ReleaseService } from "../../packages/core/src/services/release.service.js";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OUTPUT_DIR = "./.output/e2e-results-since-nov1";
const SINCE_DATE = new Date("2024-11-01T00:00:00Z");

const REPOS = [
	{ owner: "langchain-ai", repo: "langchainjs" },
	{ owner: "vuejs", repo: "core" },
	{ owner: "vitejs", repo: "vite" },
	{ owner: "angular", repo: "angular" },
	{ owner: "vercel", repo: "next.js" },
	{ owner: "oven-sh", repo: "bun" },
	{ owner: "drizzle-team", repo: "drizzle-orm" },
	{ owner: "colinhacks", repo: "zod" },
	{ owner: "anthropics", repo: "anthropic-sdk-python" },
	{ owner: "openai", repo: "openai-node" },
	{ owner: "zcashfoundation", repo: "zebra" },
];

async function main() {
	if (!GITHUB_TOKEN) {
		console.error("GITHUB_TOKEN required");
		process.exit(1);
	}

	await mkdir(OUTPUT_DIR, { recursive: true });

	console.log(`Exporting releases since ${SINCE_DATE.toISOString().split("T")[0]} to ${OUTPUT_DIR}\n`);

	const service = new ReleaseService({ token: GITHUB_TOKEN });

	for (const { owner, repo } of REPOS) {
		const filename = `${owner}-${repo}`.replace(/[/.]/g, "-");

		try {
			process.stdout.write(`Fetching ${owner}/${repo}...`);

			const result = await service.getReleasesInRange(owner, repo, {
				since: SINCE_DATE,
			});

			const jsonPath = join(OUTPUT_DIR, `${filename}.json`);
			await writeFile(jsonPath, JSON.stringify(result, null, 2));

			const totalItems = result.categories.reduce((sum, cat) => sum + cat.items.length, 0);
			console.log(`\n  ✓ ${filename}.json (${result.releaseCount} releases, ${result.categories.length} categories, ${totalItems} items)`);
		} catch (error) {
			console.log(`\n  ✗ ${filename}: ${error instanceof Error ? error.message : error}`);
		}
	}

	console.log(`\nResults saved to ${OUTPUT_DIR}/`);
}

main();
