/**
 * Export WNF outputs for manual evaluation
 * Run with: bun scripts/export-repository-outputs.ts
 *
 * Outputs saved to .output/ folder (gitignored)
 */

import { ReleaseService } from "../packages/core/src/services/release.service.js";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const OUTPUT_DIR = ".output";

const TEST_REPOS = [
	{ owner: "nestjs", repo: "nest" },
	{ owner: "expressjs", repo: "express" },
	{ owner: "prisma", repo: "prisma" },
	{ owner: "facebook", repo: "react" },
	{ owner: "vercel", repo: "ai" },
];

function formatMarkdown(result: any, mode: string): string {
	const repoPath = result.source.repo; // e.g., "nestjs/nest"

	let md = `# ${result.source.repo} - ${mode}\n\n`;
	md += `**Version:** ${result.version}\n`;
	md += `**Released:** ${result.releasedAt || "N/A"}\n`;
	md += `**Confidence:** ${(result.confidence * 100).toFixed(0)}%\n`;
	md += `**Generated From:** ${result.generatedFrom.join(", ")}\n`;
	md += `**Summary:** ${result.summary}\n\n`;

	md += `---\n\n`;

	for (const category of result.categories) {
		md += `## ${category.title}\n\n`;
		for (const item of category.items) {
			// Format refs as clickable GitHub links
			const refs = item.refs?.length
				? ` (${item.refs.map((r: string) => `[#${r}](https://github.com/${repoPath}/pull/${r})`).join(", ")})`
				: "";
			const breaking = item.breaking ? " **[BREAKING]**" : "";
			md += `- ${item.text}${refs}${breaking}\n`;
		}
		md += "\n";
	}

	if (result.notes?.length) {
		md += `## Notes\n\n`;
		for (const note of result.notes) {
			md += `- **[${note.type.toUpperCase()}]** ${note.text}\n`;
		}
		md += "\n";
	}

	md += `---\n\n`;
	md += `_Generated at: ${result.generatedAt}_\n`;
	md += `_Release URL: ${result.links.release}_\n`;

	return md;
}

async function exportRepository(owner: string, repo: string) {
	const repoDir = join(OUTPUT_DIR, `${owner}-${repo}`);
	mkdirSync(repoDir, { recursive: true });

	console.log(`\nExporting ${owner}/${repo}...`);

	// Deterministic only
	console.log("  - Fetching deterministic result...");
	const deterministicService = new ReleaseService({
		token: process.env.GITHUB_TOKEN,
		enableFallback: true,
		ai: { enabled: false, provider: "anthropic", confidenceThreshold: 0.6 },
	});

	try {
		const deterministicResult = await deterministicService.getLatestReleaseWNF(owner, repo);

		writeFileSync(
			join(repoDir, "deterministic.json"),
			JSON.stringify(deterministicResult, null, 2)
		);
		writeFileSync(
			join(repoDir, "deterministic.md"),
			formatMarkdown(deterministicResult, "Deterministic Parsing")
		);
		console.log("    ✅ Saved deterministic.json and deterministic.md");
	} catch (error) {
		console.log(`    ❌ Deterministic failed: ${error instanceof Error ? error.message : error}`);
	}

	// With AI fallback
	console.log("  - Fetching AI-enhanced result...");
	const aiService = new ReleaseService({
		token: process.env.GITHUB_TOKEN,
		enableFallback: true,
		ai: { enabled: true, provider: "anthropic", confidenceThreshold: 0.6 },
	});

	try {
		const aiResult = await aiService.getLatestReleaseWNF(owner, repo);

		writeFileSync(
			join(repoDir, "with-ai.json"),
			JSON.stringify(aiResult, null, 2)
		);
		writeFileSync(
			join(repoDir, "with-ai.md"),
			formatMarkdown(aiResult, "With AI Fallback")
		);

		const aiEnhanced = aiResult.generatedFrom.includes("ai");
		console.log(`    ✅ Saved with-ai.json and with-ai.md ${aiEnhanced ? "[AI ENHANCED]" : ""}`);
	} catch (error) {
		console.log(`    ❌ AI-enhanced failed: ${error instanceof Error ? error.message : error}`);
	}
}

async function main() {
	console.log("╔════════════════════════════════════════════════════════════════╗");
	console.log("║          Exporting Repository Outputs for Evaluation           ║");
	console.log("╚════════════════════════════════════════════════════════════════╝");

	mkdirSync(OUTPUT_DIR, { recursive: true });

	for (const { owner, repo } of TEST_REPOS) {
		await exportRepository(owner, repo);
	}

	// Create index file
	let indexMd = `# WNF Output Evaluation\n\n`;
	indexMd += `Generated: ${new Date().toISOString()}\n\n`;
	indexMd += `## Repositories\n\n`;

	for (const { owner, repo } of TEST_REPOS) {
		indexMd += `### ${owner}/${repo}\n\n`;
		indexMd += `- [Deterministic Parsing](./${owner}-${repo}/deterministic.md)\n`;
		indexMd += `- [With AI Fallback](./${owner}-${repo}/with-ai.md)\n`;
		indexMd += `- [Deterministic JSON](./${owner}-${repo}/deterministic.json)\n`;
		indexMd += `- [With AI JSON](./${owner}-${repo}/with-ai.json)\n\n`;
	}

	writeFileSync(join(OUTPUT_DIR, "README.md"), indexMd);

	console.log("\n" + "═".repeat(66));
	console.log(`\n✅ All outputs saved to .output/ folder\n`);
	console.log("Files created:");
	console.log(`  .output/README.md (index)`);
	for (const { owner, repo } of TEST_REPOS) {
		console.log(`  .output/${owner}-${repo}/deterministic.md`);
		console.log(`  .output/${owner}-${repo}/deterministic.json`);
		console.log(`  .output/${owner}-${repo}/with-ai.md`);
		console.log(`  .output/${owner}-${repo}/with-ai.json`);
	}
}

main().catch(console.error);
