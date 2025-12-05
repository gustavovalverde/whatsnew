/**
 * Validation Script: Real-World Categorization Testing
 *
 * Tests the new universal categorization architecture against real repositories
 * to validate that categorization makes sense from a developer standpoint.
 */

import { ReleaseService } from "../packages/core/src/services/release.service.js";

const service = new ReleaseService();

interface ValidationResult {
	repo: string;
	tag: string;
	format: string;
	categories: Array<{
		id: string;
		title: string;
		items: Array<{
			text: string;
			refs: string[];
		}>;
	}>;
	confidence: number;
	summary: string;
}

async function validateRepo(
	owner: string,
	repo: string,
	tag?: string,
	packageName?: string
): Promise<ValidationResult> {
	console.log(`\n${"=".repeat(80)}`);
	console.log(`📦 ${owner}/${repo}${packageName ? ` (package: ${packageName})` : ""}${tag ? ` @ ${tag}` : " (latest)"}`);
	console.log("=".repeat(80));

	try {
		const wnf = tag
			? await service.getReleaseByTagWNF(owner, repo, tag)
			: await service.getLatestReleaseWNF(owner, repo, packageName);

		console.log(`\n📋 Version: ${wnf.version}`);
		console.log(`📅 Released: ${wnf.releasedAt}`);
		console.log(`🎯 Confidence: ${(wnf.confidence * 100).toFixed(1)}%`);
		console.log(`📝 Summary: ${wnf.summary}`);
		console.log(`🔗 ${wnf.links.release}`);

		console.log(`\n📊 Categories (${wnf.categories.length}):`);
		for (const category of wnf.categories) {
			console.log(`\n  [${category.id.toUpperCase()}] ${category.title} (${category.items.length} items)`);
			for (const item of category.items.slice(0, 5)) { // Show first 5 items
				const refs = item.refs?.length ? ` (#${item.refs.join(", #")})` : "";
				console.log(`    • ${item.text.substring(0, 80)}${item.text.length > 80 ? "..." : ""}${refs}`);
			}
			if (category.items.length > 5) {
				console.log(`    ... and ${category.items.length - 5} more items`);
			}
		}

		return {
			repo: `${owner}/${repo}`,
			tag: wnf.source.tag || "latest",
			format: wnf.generatedFrom.join(", "),
			categories: wnf.categories,
			confidence: wnf.confidence,
			summary: wnf.summary,
		};
	} catch (error) {
		console.error(`❌ Error: ${error instanceof Error ? error.message : error}`);
		throw error;
	}
}

async function validateDateRange(
	owner: string,
	repo: string,
	since: string,
	until: string,
	packageFilter?: string
) {
	console.log(`\n${"=".repeat(80)}`);
	console.log(`📦 ${owner}/${repo} (Date Range: ${since} to ${until})${packageFilter ? ` [filter: ${packageFilter}]` : ""}`);
	console.log("=".repeat(80));

	try {
		const wnf = await service.getReleasesInRange(owner, repo, {
			since,
			until,
			packageFilter,
		});

		console.log(`\n📋 Releases included: ${wnf.releaseCount}`);
		console.log(`🎯 Average Confidence: ${(wnf.confidence * 100).toFixed(1)}%`);
		console.log(`📝 Summary: ${wnf.summary}`);

		if (wnf.releases.length > 0) {
			console.log(`\n📦 Releases:`);
			for (const rel of wnf.releases.slice(0, 5)) {
				console.log(`    • ${rel.tag} (${rel.releasedAt.split("T")[0]})`);
			}
			if (wnf.releases.length > 5) {
				console.log(`    ... and ${wnf.releases.length - 5} more releases`);
			}
		}

		console.log(`\n📊 Aggregated Categories (${wnf.categories.length}):`);
		for (const category of wnf.categories) {
			console.log(`\n  [${category.id.toUpperCase()}] ${category.title} (${category.items.length} items)`);
			for (const item of category.items.slice(0, 3)) {
				const refs = item.refs?.length ? ` (#${item.refs.join(", #")})` : "";
				console.log(`    • ${item.text.substring(0, 70)}${item.text.length > 70 ? "..." : ""}${refs}`);
			}
			if (category.items.length > 3) {
				console.log(`    ... and ${category.items.length - 3} more items`);
			}
		}

		return wnf;
	} catch (error) {
		console.error(`❌ Error: ${error instanceof Error ? error.message : error}`);
		throw error;
	}
}

// Detailed validation: Check if categorization makes sense
function analyzeCategorizationQuality(result: ValidationResult) {
	console.log(`\n🔍 VALIDATION ANALYSIS for ${result.repo}`);
	console.log("-".repeat(60));

	const issues: string[] = [];
	const good: string[] = [];

	for (const category of result.categories) {
		for (const item of category.items) {
			const text = item.text.toLowerCase();

			// Check for mismatches
			if (category.id === "features") {
				if (text.includes("fix") || text.includes("bug") || text.includes("error")) {
					issues.push(`⚠️  FEATURES contains fix-like: "${item.text.substring(0, 50)}..."`);
				} else if (text.includes("add") || text.includes("new") || text.includes("support") || text.includes("implement")) {
					good.push(`✓ FEATURES correctly has: "${item.text.substring(0, 40)}..."`);
				}
			}

			if (category.id === "fixes") {
				if (text.includes("add") || text.includes("new feature") || text.includes("implement")) {
					issues.push(`⚠️  FIXES contains feature-like: "${item.text.substring(0, 50)}..."`);
				} else if (text.includes("fix") || text.includes("bug") || text.includes("resolve") || text.includes("correct")) {
					good.push(`✓ FIXES correctly has: "${item.text.substring(0, 40)}..."`);
				}
			}

			if (category.id === "breaking") {
				if (!text.includes("break") && !text.includes("remov") && !text.includes("deprecat") && !text.includes("migrat")) {
					// Might still be breaking based on context
				} else {
					good.push(`✓ BREAKING correctly has: "${item.text.substring(0, 40)}..."`);
				}
			}

			if (category.id === "docs") {
				if (text.includes("doc") || text.includes("readme") || text.includes("comment")) {
					good.push(`✓ DOCS correctly has: "${item.text.substring(0, 40)}..."`);
				}
			}

			if (category.id === "security") {
				if (text.includes("security") || text.includes("vulnerab") || text.includes("cve")) {
					good.push(`✓ SECURITY correctly has: "${item.text.substring(0, 40)}..."`);
				}
			}
		}
	}

	// Show results
	if (good.length > 0) {
		console.log(`\n✅ Good categorizations (${good.length}):`);
		for (const g of good.slice(0, 5)) {
			console.log(`   ${g}`);
		}
		if (good.length > 5) {
			console.log(`   ... and ${good.length - 5} more`);
		}
	}

	if (issues.length > 0) {
		console.log(`\n⚠️  Potential issues (${issues.length}):`);
		for (const issue of issues) {
			console.log(`   ${issue}`);
		}
	} else {
		console.log(`\n✅ No obvious categorization issues detected!`);
	}

	return { issues, good };
}

async function main() {
	console.log("🧪 CATEGORIZATION VALIDATION TEST");
	console.log("Testing universal categorization against real repositories\n");

	const results: ValidationResult[] = [];

	// Test 1: vercel/ai - Changesets format, monorepo
	try {
		const result = await validateRepo("vercel", "ai", "ai@4.0.0");
		results.push(result);
		analyzeCategorizationQuality(result);
	} catch (e) {
		console.error("Failed to validate vercel/ai");
	}

	// Test 2: facebook/react - GitHub auto-generated
	try {
		const result = await validateRepo("facebook", "react");
		results.push(result);
		analyzeCategorizationQuality(result);
	} catch (e) {
		console.error("Failed to validate facebook/react");
	}

	// Test 3: expressjs/express - Traditional changelog
	try {
		const result = await validateRepo("expressjs", "express");
		results.push(result);
		analyzeCategorizationQuality(result);
	} catch (e) {
		console.error("Failed to validate expressjs/express");
	}

	// Test 4: microsoft/TypeScript - Large project
	try {
		const result = await validateRepo("microsoft", "TypeScript");
		results.push(result);
		analyzeCategorizationQuality(result);
	} catch (e) {
		console.error("Failed to validate microsoft/TypeScript");
	}

	// Test 5: Date range test with vercel/ai
	try {
		console.log("\n\n" + "🗓️ ".repeat(20));
		console.log("DATE RANGE AGGREGATION TEST");
		console.log("🗓️ ".repeat(20));

		await validateDateRange("vercel", "ai", "2024-10-01", "2024-11-01", "ai@*");
	} catch (e) {
		console.error("Failed date range validation");
	}

	// Summary
	console.log("\n\n" + "=".repeat(80));
	console.log("📊 VALIDATION SUMMARY");
	console.log("=".repeat(80));
	console.log(`\nRepositories tested: ${results.length}`);
	console.log(`Average confidence: ${(results.reduce((sum, r) => sum + r.confidence, 0) / results.length * 100).toFixed(1)}%`);

	const totalCategories = results.reduce((sum, r) => sum + r.categories.length, 0);
	const totalItems = results.reduce((sum, r) =>
		sum + r.categories.reduce((s, c) => s + c.items.length, 0), 0);

	console.log(`Total categories: ${totalCategories}`);
	console.log(`Total items categorized: ${totalItems}`);
}

main().catch(console.error);
