import type {
	ConfidenceBreakdown,
	SourceResult,
	WNFDocument,
} from "@whatsnew/types";
import { calculateCompositeConfidence } from "@whatsnew/utils";
import { AIExtractor } from "../ai/ai-extractor.js";
import { QualityAssessor } from "../ai/quality-assessor.js";
import type { AIConfig } from "../ai/types.js";
import { buildCategorySummary } from "../services/range/index.js";
import {
	ChangelogFileSource,
	CommitHistorySource,
	type DataSource,
	type DataSourceOptions,
	GitHubReleaseSource,
} from "../sources/index.js";
import {
	createPipelineContext,
	enhanceWithAI,
	fetchCommits,
	fetchPrimary,
	filterQuality,
	mergeSources,
} from "./pipeline/index.js";

/**
 * Options for DataAggregator
 */
export interface DataAggregatorOptions extends DataSourceOptions {
	ai?: Partial<AIConfig>;
}

/**
 * DataAggregator orchestrates multiple data sources with AUGMENTATION strategy
 *
 * Source priority:
 * 1. GitHub Release - Primary source, highest signal when available
 * 2. CHANGELOG.md - Secondary source for well-maintained projects
 * 3. Commit History - Universal source, always available for completeness
 *
 * Strategy: AUGMENTATION (not fallback)
 * - Collect data from primary source (release notes)
 * - ALWAYS augment with commit history to catch undocumented changes
 * - Deduplicate by matching PR numbers, commit refs, or text similarity
 * - Result is the UNION of all discovered changes
 *
 * This ensures features like "feat(health): add endpoints" in commits
 * are captured even if not documented in release notes.
 */
export class DataAggregator {
	private readonly sources: DataSource[];
	private readonly qualityAssessor: QualityAssessor;
	private readonly aiExtractor: AIExtractor;

	constructor(options: DataAggregatorOptions) {
		// Sources in priority order
		this.sources = [
			new GitHubReleaseSource(options),
			new ChangelogFileSource(options),
			new CommitHistorySource(options),
		];

		// Initialize AI components
		this.qualityAssessor = new QualityAssessor(options.ai?.confidenceThreshold);
		this.aiExtractor = new AIExtractor(options.ai);
	}

	/**
	 * Get release data using multi-source AUGMENTATION strategy
	 *
	 * Strategy:
	 * 1. Try primary sources (release notes, changelog) for curated content
	 * 2. ALWAYS augment with commit history to catch undocumented changes
	 * 3. Deduplicate and merge all discovered items
	 *
	 * @param owner - GitHub repository owner
	 * @param repo - GitHub repository name
	 * @param tag - Optional tag (defaults to latest)
	 * @returns WNF document with release information
	 */
	async getRelease(
		owner: string,
		repo: string,
		tag?: string,
	): Promise<WNFDocument> {
		// Initialize pipeline context
		let ctx = createPipelineContext(owner, repo, tag);

		// Phase 1: Fetch from primary sources (release notes, changelog)
		ctx = await fetchPrimary(ctx, this.sources);

		// Phase 2: Augment with commit history
		ctx = await fetchCommits(ctx, this.sources);

		// Phase 3: Merge all sources
		ctx = mergeSources(ctx);

		if (!ctx.finalResult) {
			throw new Error(
				`No release data available for ${owner}/${repo}${tag ? `@${tag}` : ""}`,
			);
		}

		// Phase 4: AI enhancement if quality is low
		ctx = await enhanceWithAI(ctx, this.qualityAssessor, this.aiExtractor);

		// Phase 5: Filter low-quality items
		ctx = filterQuality(ctx);

		return this.toWNFDocument(
			// biome-ignore lint/style/noNonNullAssertion: validated above with null check
			ctx.finalResult!,
			owner,
			repo,
			tag,
			[...ctx.sourcesUsed],
			ctx.aiEnhanced,
		);
	}

	/**
	 * Get release data specifically from a tag
	 */
	async getReleaseByTag(
		owner: string,
		repo: string,
		tag: string,
	): Promise<WNFDocument> {
		return this.getRelease(owner, repo, tag);
	}

	/**
	 * Convert SourceResult to WNFDocument
	 *
	 * Calculates composite confidence score using the mathematical quality model.
	 * This adjusts the format-based confidence to reflect actual content quality.
	 *
	 * @see https://elsevier.blog/composite-scores/ - Composite score methodology
	 * @see docs/decisions/001-input-quality-limitations.md - ADR for this implementation
	 */
	private toWNFDocument(
		result: SourceResult,
		owner: string,
		repo: string,
		tag: string | undefined,
		sourcesUsed: string[],
		aiEnhanced = false,
	): WNFDocument {
		// Use original tag from metadata (preserves v prefix), then fall back to parameter
		const originalTag = result.metadata?.tag || tag;
		const version =
			result.metadata?.version || tag?.replace(/^v/, "") || "unknown";
		const summary = buildCategorySummary(result.categories);

		// Extract items for quality scoring
		// Flatten all categories into items with their metadata
		const items = result.categories.flatMap((category) =>
			category.items.map((item) => ({
				text: item.text,
				// Extract conventional type from text if present
				conventionalType: this.extractConventionalType(item.text),
				scope: item.scope,
				refs: item.refs,
			})),
		);

		// Calculate composite confidence using the mathematical quality model
		// This adjusts format-based confidence to reflect actual content quality
		const confidenceResult = calculateCompositeConfidence(
			result.confidence, // Format-based confidence from parser
			items,
			items.length, // Estimated count = actual count
		);

		// Build confidence breakdown for transparency
		const confidenceBreakdown: ConfidenceBreakdown = {
			composite: confidenceResult.composite,
			structural: confidenceResult.structural,
			quality: confidenceResult.quality,
			terseRatio: confidenceResult.metrics.terseRatio,
			itemCount: confidenceResult.metrics.itemCount,
		};

		// Prefer GitHub's actual URL, fall back to constructed URL
		const releaseUrl =
			result.metadata?.releaseUrl ||
			`https://github.com/${owner}/${repo}/releases/tag/${originalTag || version}`;

		const doc: WNFDocument = {
			spec: "wnf/0.1",
			source: {
				platform: "github",
				repo: `${owner}/${repo}`,
				tag: originalTag || version,
			},
			version,
			releasedAt: result.metadata?.date,
			summary,
			categories: result.categories,
			links: {
				release: releaseUrl,
				compare: result.metadata?.compareUrl,
			},
			// Use composite confidence instead of format-only confidence
			confidence: confidenceResult.composite,
			confidenceBreakdown,
			generatedFrom: sourcesUsed,
			generatedAt: new Date().toISOString(),
		};

		// Add AI enhancement info if applicable
		if (aiEnhanced) {
			(doc as WNFDocument & { aiEnhanced?: boolean }).aiEnhanced = true;
		}

		return doc;
	}

	/**
	 * Extract conventional commit type from item text if present
	 *
	 * Looks for patterns like "feat:", "fix(scope):", etc. at the start of text.
	 */
	private extractConventionalType(text: string): string | undefined {
		const match = text.match(
			/^(feat|fix|docs|style|refactor|perf|test|build|ci|chore)(?:\([^)]+\))?!?:/i,
		);
		return match ? match[1].toLowerCase() : undefined;
	}
}
