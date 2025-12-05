/**
 * Validate WNF outputs across multiple real-world repositories
 * Run with: bun scripts/validate-repositories.ts
 *
 * This script tests both deterministic parsing and AI fallback to compare results.
 */

import { ReleaseService } from "../packages/core/src/services/release.service.js";

// Test repositories that we identified as problematic
const TEST_REPOS = [
	{ owner: "nestjs", repo: "nest", issue: "#### headers not recognized" },
	{ owner: "expressjs", repo: "express", issue: "blockquotes ignored" },
	{ owner: "prisma", repo: "prisma", issue: "all items in 'other'" },
	{ owner: "facebook", repo: "react", issue: "categorization issues" },
	{ owner: "vercel", repo: "ai", issue: "monorepo - changesets format" },
];

interface TestResult {
	repo: string;
	knownIssue: string;
	deterministic: {
		categories: Array<{ id: string; count: number }>;
		totalItems: number;
		confidence: number;
		otherRatio: number;
	};
	withAI: {
		categories: Array<{ id: string; count: number }>;
		totalItems: number;
		confidence: number;
		otherRatio: number;
		aiEnhanced: boolean;
	} | null;
	improvement: string;
	verdict: "improved" | "same" | "worse" | "error";
}

async function testRepository(
	owner: string,
	repo: string,
	knownIssue: string,
): Promise<TestResult> {
	const result: TestResult = {
		repo: `${owner}/${repo}`,
		knownIssue,
		deterministic: { categories: [], totalItems: 0, confidence: 0, otherRatio: 0 },
		withAI: null,
		improvement: "",
		verdict: "error",
	};

	try {
		// Test 1: Deterministic only (no AI fallback)
		const deterministicService = new ReleaseService({
			token: process.env.GITHUB_TOKEN,
			enableFallback: true,
			ai: { enabled: false, provider: "anthropic", confidenceThreshold: 0.6 },
		});

		const deterministicResult = await deterministicService.getLatestReleaseWNF(owner, repo);

		const deterministicCategories = deterministicResult.categories.map(c => ({
			id: c.id,
			count: c.items.length,
		}));
		const deterministicTotal = deterministicCategories.reduce((sum, c) => sum + c.count, 0);
		const deterministicOther = deterministicCategories.find(c => c.id === "other")?.count || 0;

		result.deterministic = {
			categories: deterministicCategories.filter(c => c.count > 0),
			totalItems: deterministicTotal,
			confidence: deterministicResult.confidence,
			otherRatio: deterministicTotal > 0 ? deterministicOther / deterministicTotal : 0,
		};

		// Test 2: With AI fallback enabled
		const aiService = new ReleaseService({
			token: process.env.GITHUB_TOKEN,
			enableFallback: true,
			ai: { enabled: true, provider: "anthropic", confidenceThreshold: 0.6 },
		});

		const aiResult = await aiService.getLatestReleaseWNF(owner, repo);

		const aiCategories = aiResult.categories.map(c => ({
			id: c.id,
			count: c.items.length,
		}));
		const aiTotal = aiCategories.reduce((sum, c) => sum + c.count, 0);
		const aiOther = aiCategories.find(c => c.id === "other")?.count || 0;
		const aiEnhanced = aiResult.generatedFrom.includes("ai");

		result.withAI = {
			categories: aiCategories.filter(c => c.count > 0),
			totalItems: aiTotal,
			confidence: aiResult.confidence,
			otherRatio: aiTotal > 0 ? aiOther / aiTotal : 0,
			aiEnhanced,
		};

		// Evaluate improvement
		const improvements: string[] = [];

		if (aiEnhanced) {
			improvements.push("AI enhanced");
		}

		if (result.withAI.otherRatio < result.deterministic.otherRatio) {
			const reduction = Math.round((result.deterministic.otherRatio - result.withAI.otherRatio) * 100);
			improvements.push(`${reduction}% fewer 'other' items`);
		}

		if (result.withAI.categories.length > result.deterministic.categories.length) {
			improvements.push(`+${result.withAI.categories.length - result.deterministic.categories.length} categories`);
		}

		if (result.withAI.totalItems > result.deterministic.totalItems) {
			improvements.push(`+${result.withAI.totalItems - result.deterministic.totalItems} items extracted`);
		}

		result.improvement = improvements.length > 0 ? improvements.join(", ") : "No change";

		// Determine verdict
		if (aiEnhanced && result.withAI.otherRatio < result.deterministic.otherRatio) {
			result.verdict = "improved";
		} else if (aiEnhanced && result.withAI.totalItems > result.deterministic.totalItems) {
			result.verdict = "improved";
		} else if (!aiEnhanced && result.deterministic.confidence >= 0.6) {
			result.verdict = "same"; // Good enough without AI
		} else {
			result.verdict = "same";
		}

	} catch (error) {
		result.improvement = error instanceof Error ? error.message : "Unknown error";
		result.verdict = "error";
	}

	return result;
}

function printCategoryBreakdown(label: string, categories: Array<{ id: string; count: number }>) {
	console.log(`    ${label}:`);
	for (const cat of categories.sort((a, b) => b.count - a.count)) {
		const bar = "█".repeat(Math.min(cat.count, 20));
		console.log(`      ${cat.id.padEnd(12)} ${String(cat.count).padStart(3)} ${bar}`);
	}
}

async function main() {
	console.log("╔════════════════════════════════════════════════════════════════╗");
	console.log("║     WNF Repository Validation - AI Smart Fallback Test         ║");
	console.log("╚════════════════════════════════════════════════════════════════╝\n");

	// Check environment
	if (!process.env.GITHUB_TOKEN) {
		console.log("⚠️  GITHUB_TOKEN not set - API rate limits may apply\n");
	}

	if (!process.env.AI_GATEWAY_API_KEY) {
		console.log("❌ AI_GATEWAY_API_KEY not set - AI fallback will be disabled\n");
		console.log("Set the environment variable to test AI enhancement.\n");
	} else {
		console.log("✅ AI_GATEWAY_API_KEY is set\n");
	}

	const results: TestResult[] = [];

	for (const { owner, repo, issue } of TEST_REPOS) {
		console.log(`\n${"─".repeat(66)}`);
		console.log(`📦 Testing: ${owner}/${repo}`);
		console.log(`   Known issue: ${issue}`);
		console.log(`${"─".repeat(66)}`);

		const result = await testRepository(owner, repo, issue);
		results.push(result);

		if (result.verdict === "error") {
			console.log(`\n   ❌ Error: ${result.improvement}`);
			continue;
		}

		// Print deterministic results
		console.log(`\n   📊 Deterministic Parsing:`);
		console.log(`      Confidence: ${(result.deterministic.confidence * 100).toFixed(0)}%`);
		console.log(`      Total items: ${result.deterministic.totalItems}`);
		console.log(`      'Other' ratio: ${(result.deterministic.otherRatio * 100).toFixed(0)}%`);
		printCategoryBreakdown("Categories", result.deterministic.categories);

		// Print AI results if available
		if (result.withAI) {
			console.log(`\n   🤖 With AI Fallback:`);
			console.log(`      AI Enhanced: ${result.withAI.aiEnhanced ? "Yes" : "No"}`);
			console.log(`      Confidence: ${(result.withAI.confidence * 100).toFixed(0)}%`);
			console.log(`      Total items: ${result.withAI.totalItems}`);
			console.log(`      'Other' ratio: ${(result.withAI.otherRatio * 100).toFixed(0)}%`);
			printCategoryBreakdown("Categories", result.withAI.categories);
		}

		// Print verdict
		const verdictEmoji = {
			improved: "✅",
			same: "➖",
			worse: "❌",
			error: "💥",
		}[result.verdict];

		console.log(`\n   ${verdictEmoji} Verdict: ${result.verdict.toUpperCase()}`);
		console.log(`      ${result.improvement}`);
	}

	// Summary
	console.log(`\n${"═".repeat(66)}`);
	console.log("📋 SUMMARY");
	console.log(`${"═".repeat(66)}\n`);

	const improved = results.filter(r => r.verdict === "improved").length;
	const same = results.filter(r => r.verdict === "same").length;
	const errors = results.filter(r => r.verdict === "error").length;

	console.log(`   ✅ Improved: ${improved}/${results.length}`);
	console.log(`   ➖ Same:     ${same}/${results.length}`);
	console.log(`   💥 Errors:   ${errors}/${results.length}`);

	console.log("\n   Results by repository:");
	for (const result of results) {
		const emoji = { improved: "✅", same: "➖", worse: "❌", error: "💥" }[result.verdict];
		const aiUsed = result.withAI?.aiEnhanced ? " [AI]" : "";
		console.log(`   ${emoji} ${result.repo}${aiUsed}: ${result.improvement}`);
	}

	// Developer usefulness assessment
	console.log(`\n${"═".repeat(66)}`);
	console.log("🎯 DEVELOPER USEFULNESS ASSESSMENT");
	console.log(`${"═".repeat(66)}\n`);

	for (const result of results) {
		if (result.verdict === "error") continue;

		const data = result.withAI || result.deterministic;
		const hasBreaking = data.categories.some(c => c.id === "breaking" && c.count > 0);
		const hasFeatures = data.categories.some(c => c.id === "features" && c.count > 0);
		const hasFixes = data.categories.some(c => c.id === "fixes" && c.count > 0);
		const hasSecurity = data.categories.some(c => c.id === "security" && c.count > 0);
		const lowOtherRatio = data.otherRatio < 0.3;

		const useful = (hasBreaking || hasFeatures || hasFixes || hasSecurity) && lowOtherRatio;

		console.log(`   ${result.repo}:`);
		console.log(`      Breaking changes identified: ${hasBreaking ? "✅" : "❌"}`);
		console.log(`      Features identified:         ${hasFeatures ? "✅" : "❌"}`);
		console.log(`      Fixes identified:            ${hasFixes ? "✅" : "❌"}`);
		console.log(`      Security issues identified:  ${hasSecurity ? "✅" : "❌"}`);
		console.log(`      Low 'other' ratio (<30%):    ${lowOtherRatio ? "✅" : "❌"}`);
		console.log(`      → Useful for developers:     ${useful ? "✅ YES" : "⚠️  NEEDS IMPROVEMENT"}\n`);
	}
}

main().catch(console.error);
