/**
 * Integration test script to validate parsers against real GitHub repositories
 *
 * Run with: bun run tests/integration/validate-repositories.ts
 */

import testRepos from "../fixtures/test-repositories.json";

const API_BASE = process.env.API_URL || "http://localhost:3000";

interface TestResult {
	repo: string;
	success: boolean;
	confidence: number | null;
	categoriesCount: number;
	detectedFormat: string | null;
	expectedFormat: string;
	error?: string;
	responseTime: number;
}

async function testRepository(
	repo: string,
	expectedFormat: string,
	isMonorepo?: boolean,
	packages?: string[],
): Promise<TestResult> {
	const [owner, repoName] = repo.split("/");
	const start = Date.now();

	try {
		// For monorepos, test with the first package
		const packageParam =
			isMonorepo && packages?.length ? `?package=${packages[0]}` : "";
		const url = `${API_BASE}/v1/repos/github/${owner}/${repoName}/releases/latest/whats-new${packageParam}`;

		const response = await fetch(url);
		const responseTime = Date.now() - start;

		if (!response.ok) {
			const errorBody = await response.json().catch(() => ({}));

			// Handle monorepo detection gracefully
			if (
				response.status === 400 &&
				(errorBody as { error?: string }).error === "Monorepo detected"
			) {
				return {
					repo,
					success: true,
					confidence: null,
					categoriesCount: 0,
					detectedFormat: "monorepo-detected",
					expectedFormat,
					responseTime,
				};
			}

			throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorBody)}`);
		}

		const data = (await response.json()) as {
			confidence?: number;
			categories?: unknown[];
		};

		return {
			repo,
			success: true,
			confidence: data.confidence ?? null,
			categoriesCount: data.categories?.length ?? 0,
			detectedFormat: inferFormat(data),
			expectedFormat,
			responseTime,
		};
	} catch (error) {
		return {
			repo,
			success: false,
			confidence: null,
			categoriesCount: 0,
			detectedFormat: null,
			expectedFormat,
			error: error instanceof Error ? error.message : String(error),
			responseTime: Date.now() - start,
		};
	}
}

function inferFormat(data: {
	confidence?: number;
	categories?: unknown[];
}): string {
	// Infer format based on confidence and response structure
	if (data.confidence === 0.9) {
		return "structured"; // Could be github-auto, keep-a-changelog, or changesets
	}
	if (data.confidence === 0.85) {
		return "conventional-commits";
	}
	if (data.confidence === 0.7) {
		return "basic-structure";
	}
	return "generic";
}

async function runTests(
	limit?: number,
): Promise<{ results: TestResult[]; summary: Summary }> {
	const repos = limit
		? testRepos.repositories.slice(0, limit)
		: testRepos.repositories;

	console.log(`\n🧪 Testing ${repos.length} repositories...\n`);

	const results: TestResult[] = [];

	for (const repoConfig of repos) {
		const result = await testRepository(
			repoConfig.repo,
			repoConfig.expectedFormat,
			repoConfig.isMonorepo,
			repoConfig.packages,
		);

		results.push(result);

		const status = result.success ? "✅" : "❌";
		const confidence = result.confidence !== null ? result.confidence : "N/A";
		const categories = result.categoriesCount;

		console.log(
			`${status} ${repoConfig.repo.padEnd(35)} conf=${String(confidence).padEnd(4)} cats=${categories} (${result.responseTime}ms)`,
		);

		if (result.error) {
			console.log(`   └─ Error: ${result.error}`);
		}

		// Rate limit to avoid GitHub API throttling
		await new Promise((resolve) => setTimeout(resolve, 500));
	}

	const summary = calculateSummary(results);
	printSummary(summary);

	return { results, summary };
}

interface Summary {
	total: number;
	successful: number;
	failed: number;
	avgConfidence: number;
	avgResponseTime: number;
	highConfidence: number;
	lowConfidence: number;
	withCategories: number;
}

function calculateSummary(results: TestResult[]): Summary {
	const successful = results.filter((r) => r.success);
	const confidences = successful
		.map((r) => r.confidence)
		.filter((c): c is number => c !== null);

	return {
		total: results.length,
		successful: successful.length,
		failed: results.length - successful.length,
		avgConfidence:
			confidences.length > 0
				? confidences.reduce((a, b) => a + b, 0) / confidences.length
				: 0,
		avgResponseTime:
			results.reduce((a, r) => a + r.responseTime, 0) / results.length,
		highConfidence: confidences.filter((c) => c >= 0.9).length,
		lowConfidence: confidences.filter((c) => c < 0.7).length,
		withCategories: results.filter((r) => r.categoriesCount > 0).length,
	};
}

function printSummary(summary: Summary): void {
	console.log(`\n${"=".repeat(60)}`);
	console.log("📊 SUMMARY");
	console.log("=".repeat(60));
	console.log(`Total repositories tested: ${summary.total}`);
	console.log(
		`Successful:                ${summary.successful} (${((summary.successful / summary.total) * 100).toFixed(1)}%)`,
	);
	console.log(`Failed:                    ${summary.failed}`);
	console.log(`Average confidence:        ${summary.avgConfidence.toFixed(2)}`);
	console.log(
		`Average response time:     ${summary.avgResponseTime.toFixed(0)}ms`,
	);
	console.log(
		`High confidence (≥0.9):    ${summary.highConfidence} (${((summary.highConfidence / summary.total) * 100).toFixed(1)}%)`,
	);
	console.log(
		`Low confidence (<0.7):     ${summary.lowConfidence} (${((summary.lowConfidence / summary.total) * 100).toFixed(1)}%)`,
	);
	console.log(
		`With categories:           ${summary.withCategories} (${((summary.withCategories / summary.total) * 100).toFixed(1)}%)`,
	);
	console.log(`${"=".repeat(60)}\n`);
}

// Run tests
const repoLimit = process.argv[2]
	? Number.parseInt(process.argv[2], 10)
	: undefined;
runTests(repoLimit).catch(console.error);
