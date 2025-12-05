#!/usr/bin/env bun
/**
 * Export E2E results for manual review
 *
 * Saves full WNF documents to .output/e2e-results/ for evaluation
 */

import { ReleaseService } from "../../packages/core/src/services/release.service.js";
import { GitHubClient } from "../../packages/core/src/integrations/github-client.js";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OUTPUT_DIR = "./.output/e2e-results";

// Key repos to export for manual evaluation
const REPOS_TO_EXPORT = [
	// Previously had 0 items - now should have content
	{ owner: "langchain-ai", repo: "langchainjs" },
	{ owner: "vuejs", repo: "core" },
	{ owner: "vitejs", repo: "vite" },
	{ owner: "angular", repo: "angular" },
	{ owner: "vercel", repo: "next.js" },
	// Good examples
	{ owner: "oven-sh", repo: "bun" },
	{ owner: "drizzle-team", repo: "drizzle-orm" },
	{ owner: "colinhacks", repo: "zod" },
	// Moderate examples
	{ owner: "anthropics", repo: "anthropic-sdk-python" },
	{ owner: "openai", repo: "openai-node" },
];

async function main() {
	if (!GITHUB_TOKEN) {
		console.error("GITHUB_TOKEN required");
		process.exit(1);
	}

	await mkdir(OUTPUT_DIR, { recursive: true });

	const github = new GitHubClient({ token: GITHUB_TOKEN });
	const service = new ReleaseService({ github, enableFallback: true });

	console.log(`Exporting ${REPOS_TO_EXPORT.length} repos to ${OUTPUT_DIR}\n`);

	for (const { owner, repo } of REPOS_TO_EXPORT) {
		try {
			console.log(`Fetching ${owner}/${repo}...`);
			const wnf = await service.getLatestReleaseWNF(owner, repo);

			const filename = `${owner}-${repo}.json`;
			const filepath = join(OUTPUT_DIR, filename);

			await writeFile(filepath, JSON.stringify(wnf, null, 2));

			const itemCount = wnf.categories.reduce((sum, cat) => sum + cat.items.length, 0);
			console.log(`  ✓ ${filename} (${wnf.categories.length} categories, ${itemCount} items)\n`);
		} catch (error) {
			console.error(`  ✗ ${owner}/${repo}: ${error instanceof Error ? error.message : error}\n`);
		}
	}

	console.log(`\nResults saved to ${OUTPUT_DIR}/`);
}

main();
