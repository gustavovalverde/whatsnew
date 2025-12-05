/**
 * Test script for AI extraction
 * Run with: bun scripts/test-ai-extraction.ts
 */

import { AIExtractor, QualityAssessor } from "../packages/core/src/ai/index.js";

// Sample release body that would trigger AI fallback (poorly structured)
const SAMPLE_RELEASE_BODY = `
## v10.0.0

This release includes several important updates and improvements.

#### Core Updates
- Upgraded to Node.js 20 LTS
- New middleware system with improved performance
- **BREAKING**: Removed deprecated \`legacyMode\` option

#### Platform Support
- Added support for Bun runtime
- Improved Docker containerization
- Fixed Windows path handling issues (#4521)

#### Dependencies
- Updated all peer dependencies
- Migrated from webpack to esbuild (#4489)

> [!IMPORTANT]
> This release requires migration steps. See MIGRATION.md for details.

### Contributors
Thanks to @user1, @user2, and @user3 for their contributions!
`;

async function testAIExtraction() {
	console.log("=== AI Extraction Test ===\n");

	// Check environment
	console.log("Environment check:");
	console.log(
		`  AI_GATEWAY_API_KEY: ${process.env.AI_GATEWAY_API_KEY ? "set (" + process.env.AI_GATEWAY_API_KEY.slice(0, 8) + "...)" : "not set"}`,
	);
	console.log("");

	// Test QualityAssessor
	const assessor = new QualityAssessor(0.6);
	const assessment = assessor.assess(
		[{ id: "other", title: "Other", items: [{ text: "test", refs: [] }] }],
		0.5,
		SAMPLE_RELEASE_BODY.length,
	);

	console.log("QualityAssessor result:");
	console.log(`  Score: ${assessment.score}`);
	console.log(`  Should fallback to AI: ${assessment.shouldFallbackToAI}`);
	console.log(`  Reasons: ${assessment.reasons.join(", ")}`);
	console.log("");

	// Test AIExtractor - uses AI Gateway with model format "provider/model"
	const extractor = new AIExtractor({
		enabled: true,
		provider: "anthropic",
		// Model format for AI Gateway: provider/model-name
		model: "anthropic/claude-3-haiku-20240307",
	});

	console.log("AIExtractor check:");
	console.log(`  Available: ${extractor.isAvailable()}`);
	console.log("");

	if (!extractor.isAvailable()) {
		console.log("AI extraction not available. Set AI_GATEWAY_API_KEY environment variable.");
		return;
	}

	console.log("Running AI extraction via Vercel AI Gateway...\n");
	const startTime = Date.now();

	try {
		const result = await extractor.extract(SAMPLE_RELEASE_BODY);
		const duration = Date.now() - startTime;

		if (result) {
			console.log(`AI extraction successful (${duration}ms):\n`);
			console.log(`Has breaking changes: ${result.hasBreakingChanges}`);
			console.log(`Version: ${result.version || "not detected"}`);
			console.log(`\nCategories extracted:`);

			for (const category of result.categories) {
				console.log(`\n  ${category.title} (${category.id}):`);
				for (const item of category.items) {
					const refs = item.refs?.length ? ` [${item.refs.join(", ")}]` : "";
					const breaking = item.breaking ? " [BREAKING]" : "";
					console.log(`    - ${item.text}${refs}${breaking}`);
				}
			}

			if (result.notes?.length) {
				console.log(`\n  Notes:`);
				for (const note of result.notes) {
					console.log(`    [${note.type}] ${note.text}`);
				}
			}
		} else {
			console.log("AI extraction returned null");
		}
	} catch (error) {
		console.error("AI extraction failed:", error);
	}
}

testAIExtraction();
