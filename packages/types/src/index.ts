import { z } from "zod";

/**
 * WNF (What's New Format) v0.1 Specification
 * Machine-readable changelog data format
 */

export const ChangeItemSchema = z.object({
	text: z.string(),
	refs: z.array(z.string()).optional(),
	scope: z.string().optional(),
	breaking: z.boolean().optional(),
	score: z.number().min(0).max(1).optional(),
});

export const CategorySchema = z.object({
	id: z.enum([
		"breaking",
		"features",
		"fixes",
		"security",
		"perf",
		"deps",
		"docs",
		"refactor",
		"chore",
		"other",
	]),
	title: z.string(),
	items: z.array(ChangeItemSchema),
});

export const NoteSchema = z.object({
	type: z.enum(["upgrade", "migration", "deprecation", "info"]),
	text: z.string(),
});

export const SourceSchema = z.object({
	platform: z.enum(["github", "gitlab"]),
	repo: z.string(),
	tag: z.string().optional(),
	commitRange: z
		.object({
			base: z.string(),
			head: z.string(),
		})
		.optional(),
});

export const ConfidenceBreakdownSchema = z.object({
	composite: z.number().min(0).max(1),
	structural: z.number().min(0).max(1),
	quality: z.number().min(0).max(1),
	terseRatio: z.number().min(0).max(1),
	itemCount: z.number().int().min(0),
});

export const WNFDocumentSchema = z.object({
	spec: z.literal("wnf/0.1"),
	source: SourceSchema,
	version: z.string().optional(),
	releasedAt: z.string().datetime().optional(),
	summary: z.string(),
	categories: z.array(CategorySchema),
	notes: z.array(NoteSchema).optional(),
	links: z.object({
		release: z.string().url().optional(),
		compare: z.string().url().optional(),
		changelog: z.string().url().optional(),
	}),
	confidence: z.number().min(0).max(1),
	/** Detailed confidence breakdown (when available) */
	confidenceBreakdown: ConfidenceBreakdownSchema.optional(),
	generatedFrom: z.array(z.string()),
	generatedAt: z.string().datetime().optional(),
});

export type ChangeItem = z.infer<typeof ChangeItemSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type Note = z.infer<typeof NoteSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type WNFDocument = z.infer<typeof WNFDocumentSchema>;

export interface GitHubRelease {
	id: number;
	tag_name: string;
	name: string;
	body: string;
	published_at: string;
	html_url: string;
	draft: boolean;
	prerelease: boolean;
}

export interface GitHubCommit {
	sha: string;
	commit: {
		message: string;
		author: {
			name: string;
			email: string;
			date: string;
		};
	};
	html_url: string;
}

export interface ParsedCommit {
	type: string;
	scope?: string;
	subject: string;
	body?: string;
	breaking: boolean;
	breakingChange?: string;
	refs: string[];
}

export interface ChangelogEntry {
	version: string;
	date?: string;
	changes: {
		added?: string[];
		changed?: string[];
		deprecated?: string[];
		removed?: string[];
		fixed?: string[];
		security?: string[];
	};
}

/**
 * GitHub auto-generated release entry
 * @see https://docs.github.com/en/repositories/releasing-projects-on-github/automatically-generated-release-notes
 */
export interface GitHubAutoEntry {
	title: string;
	author: string;
	prUrl: string;
	prNumber: number;
}

/**
 * New contributor from GitHub auto-generated release notes
 */
export interface GitHubAutoContributor {
	username: string;
	prUrl: string;
	prNumber: number;
}

/**
 * Parsed GitHub auto-generated release notes structure
 */
export interface GitHubAutoRelease {
	categories: Array<{
		title: string;
		items: GitHubAutoEntry[];
	}>;
	newContributors: GitHubAutoContributor[];
	fullChangelogUrl?: string;
}

/**
 * GitHub tag reference
 */
export interface GitHubTag {
	name: string;
	commit: {
		sha: string;
		url: string;
	};
	zipball_url: string;
	tarball_url: string;
}

/**
 * GitHub comparison response
 */
export interface GitHubComparison {
	url: string;
	html_url: string;
	status: "ahead" | "behind" | "diverged" | "identical";
	ahead_by: number;
	behind_by: number;
	total_commits: number;
	commits: GitHubCommit[];
}

/**
 * GitHub file content response
 */
export interface GitHubFileContent {
	name: string;
	path: string;
	sha: string;
	size: number;
	url: string;
	html_url: string;
	git_url: string;
	download_url: string;
	type: "file" | "dir" | "symlink" | "submodule";
	content: string;
	encoding: "base64";
}

// ============================================================================
// GITLAB TYPES
// ============================================================================

/**
 * GitLab release structure
 * @see https://docs.gitlab.com/ee/api/releases/
 */
export interface GitLabRelease {
	tag_name: string;
	name: string;
	description: string;
	created_at: string;
	released_at: string;
	upcoming_release: boolean;
	_links: {
		self: string;
		merge_requests_url?: string;
		issues_url?: string;
	};
}

/**
 * GitLab commit structure
 * @see https://docs.gitlab.com/ee/api/commits.html
 */
export interface GitLabCommit {
	id: string;
	short_id: string;
	title: string;
	message: string;
	author_name: string;
	author_email: string;
	authored_date: string;
	committed_date: string;
	web_url: string;
}

/**
 * GitLab tag structure
 * @see https://docs.gitlab.com/ee/api/tags.html
 */
export interface GitLabTag {
	name: string;
	message: string | null;
	target: string;
	commit: {
		id: string;
		short_id: string;
		title: string;
		created_at: string;
	};
	release: {
		tag_name: string;
		description: string;
	} | null;
}

/**
 * GitLab comparison response
 * @see https://docs.gitlab.com/ee/api/repositories.html#compare-branches-tags-or-commits
 */
export interface GitLabComparison {
	commit: GitLabCommit | null;
	commits: GitLabCommit[];
	diffs: unknown[];
	compare_timeout: boolean;
	compare_same_ref: boolean;
	web_url: string;
}

// ============================================================================
// PLATFORM-AGNOSTIC TYPES
// ============================================================================

/**
 * Platform-agnostic release structure
 * Normalized from GitHub/GitLab specific formats
 */
export interface PlatformRelease {
	tagName: string;
	name: string;
	body: string;
	publishedAt: string | null;
	htmlUrl: string;
	isDraft: boolean;
	isPrerelease: boolean;
}

/**
 * Platform-agnostic commit structure
 */
export interface PlatformCommit {
	sha: string;
	message: string;
	authorName: string;
	authorEmail: string;
	date: string;
	htmlUrl: string;
}

/**
 * Platform-agnostic tag structure
 */
export interface PlatformTag {
	name: string;
	commitSha: string;
}

/**
 * Platform-agnostic comparison result
 */
export interface PlatformComparison {
	commits: PlatformCommit[];
	htmlUrl: string;
}

/**
 * Platform client interface - implemented by GitHub and GitLab clients
 */
export interface PlatformClient {
	/** Platform identifier */
	readonly platform: "github" | "gitlab";

	/** Get latest release, returns null if no releases exist */
	getLatestRelease(
		owner: string,
		repo: string,
	): Promise<PlatformRelease | null>;

	/** Get release by tag */
	getReleaseByTag(
		owner: string,
		repo: string,
		tag: string,
	): Promise<PlatformRelease | null>;

	/** Get recent releases */
	getRecentReleases(
		owner: string,
		repo: string,
		options?: { perPage?: number; packageFilter?: string },
	): Promise<PlatformRelease[]>;

	/** Get releases within a date range */
	getReleasesInRange(
		owner: string,
		repo: string,
		options: {
			since: Date;
			until?: Date;
			packageFilter?: string;
			maxPages?: number;
		},
	): Promise<PlatformRelease[]>;

	/** Fetch repository tags */
	getTags(
		owner: string,
		repo: string,
		options?: { perPage?: number },
	): Promise<PlatformTag[]>;

	/** Compare two commits/tags */
	compare(
		owner: string,
		repo: string,
		base: string,
		head: string,
	): Promise<PlatformComparison>;

	/** Find changelog file in repository */
	findChangelog(
		owner: string,
		repo: string,
		options?: {
			/** Git ref (branch, tag, commit) */
			ref?: string;
			/** Package name for monorepo changelog lookup */
			packageName?: string;
			/** Release body text to extract changelog references from */
			releaseBody?: string;
		},
	): Promise<{ content: string; path: string } | null>;

	/** Detect if repository is a monorepo */
	detectMonorepo(
		owner: string,
		repo: string,
	): Promise<{ isMonorepo: boolean; packages: string[] }>;
}

/**
 * Confidence breakdown with quality metrics
 *
 * @see https://elsevier.blog/composite-scores/ - Composite score methodology
 * @see docs/decisions/001-input-quality-limitations.md - ADR for this implementation
 */
export interface ConfidenceBreakdown {
	/** Final composite confidence score (0-1) */
	composite: number;
	/** Structural accuracy dimension (0-1) - format recognition */
	structural: number;
	/** Content quality dimension (0-1) - item meaningfulness */
	quality: number;
	/** Ratio of terse items (0-1) - for display purposes */
	terseRatio: number;
	/** Count of items analyzed */
	itemCount: number;
}

/**
 * Data source result from multi-source aggregation
 */
export interface SourceResult {
	categories: Category[];
	confidence: number;
	/** Detailed confidence breakdown (when available) */
	confidenceBreakdown?: ConfidenceBreakdown;
	source: string;
	metadata?: {
		/** Original tag from GitHub/GitLab (with v prefix if present) */
		tag?: string;
		/** Release URL from GitHub/GitLab API */
		releaseUrl?: string;
		version?: string;
		date?: string;
		compareUrl?: string;
		commitCount?: number;
		rawContent?: string;
	};
}

/**
 * Options for fetching releases in a date range
 */
export interface ReleasesInRangeOptions {
	/** Start date (inclusive) */
	since: Date | string;
	/** End date (inclusive), defaults to now */
	until?: Date | string;
	/** Filter by package name (for monorepos), supports glob: "ai@*" */
	packageFilter?: string;
}

/**
 * Individual release summary within an aggregated result
 */
export interface ReleaseSummary {
	tag: string;
	version: string;
	releasedAt: string;
	url: string;
	/** Package name extracted from tag (for monorepos) */
	packageName?: string;
}

/**
 * Package-level changes within an aggregated result.
 * Groups all changes for a single package in a monorepo.
 */
export interface PackageChanges {
	/** Package name (e.g., "@ai-sdk/anthropic", "ai", or repo name for single-package) */
	name: string;
	/** Whether this is the "main" package (matches repo name or unscoped tags) */
	isMain?: boolean;
	/** Changes grouped by category */
	categories: Category[];
	/** Notes specific to this package */
	notes?: Note[];
	/** Releases for this specific package */
	releases: ReleaseSummary[];
	/** Count of releases for this package */
	releaseCount: number;
	/** Latest version in the range */
	latestVersion?: string;
	/** Average confidence for this package's releases */
	confidence: number;
}

/**
 * Aggregated WNF document combining multiple releases.
 * Uses package-first structure for proper monorepo support.
 */
export interface WNFAggregatedDocument {
	spec: "wnf/0.1";
	source: {
		platform: "github" | "gitlab";
		repo: string;
		dateRange?: {
			since: string;
			until: string;
		};
		versionRange?: {
			from: string;
			to: string;
		};
		/** If specified, only this package was queried */
		packageFilter?: string;
	};
	/** High-level summary across all packages */
	summary: string;
	/** Package-level breakdown - always present, even for single-package repos */
	packages: PackageChanges[];
	/** All releases included (flat list for reference) */
	releases: ReleaseSummary[];
	/** Total count of releases across all packages */
	releaseCount: number;
	links: {
		/** Link to releases page */
		releases: string;
	};
	/** Average confidence across all releases */
	confidence: number;
	generatedFrom: string[];
	generatedAt: string;
}

// ============================================================================
// EXTRACTION TYPES (Intermediate format for separation of concerns)
// ============================================================================

/**
 * Category ID type extracted from CategorySchema
 */
export type CategoryId = Category["id"];

/**
 * Category metadata for filtering and display
 */
export interface CategoryMeta {
	/** Whether this category is considered user-facing/important */
	important: boolean;
	/** Display priority (1 = highest) */
	priority: number;
}

/**
 * Metadata for each category type
 * Used by filter logic and downstream clients
 */
export const CATEGORY_METADATA: Record<CategoryId, CategoryMeta> = {
	breaking: { important: true, priority: 1 },
	security: { important: true, priority: 2 },
	features: { important: true, priority: 3 },
	fixes: { important: true, priority: 4 },
	perf: { important: true, priority: 5 },
	deps: { important: false, priority: 6 },
	refactor: { important: false, priority: 7 },
	chore: { important: false, priority: 8 },
	docs: { important: false, priority: 9 },
	other: { important: false, priority: 10 },
};

/**
 * Filter types for category filtering
 * - important: Show breaking, security, features, fixes, perf + breaking items from any category
 * - maintenance: Show deps, refactor, chore, docs, other (excluding breaking items)
 * - all: Show all categories (default)
 */
export type CategoryFilter = "important" | "maintenance" | "all";

/**
 * Source hint from the original changelog format.
 * This is metadata about where the item came from, NOT the final categorization.
 */
export interface SourceHint {
	/** Original section name (e.g., "Added", "Major Changes", "Features") */
	section: string;
	/** What the source format suggests as category (used as fallback only) */
	suggestedCategory?: CategoryId;
}

/**
 * Extracted item from any changelog format.
 * This is the intermediate representation before universal categorization.
 *
 * Key principle: Extraction (format-specific) and categorization (universal)
 * are separate concerns. ExtractedItem carries all metadata needed for
 * the categorizer to make consistent decisions regardless of source.
 */
export interface ExtractedItem {
	/** The change description text */
	text: string;
	/** PR/issue numbers extracted from the text */
	refs: string[];

	/** Hints from the source format (NOT final categorization) */
	sourceHint?: SourceHint;

	/** Conventional commit type if detected (e.g., "feat", "fix", "chore") */
	conventionalType?: string;
	/** Package/component scope (e.g., "core", "api", "auth") */
	scope?: string;
	/** Whether this is explicitly marked as a breaking change */
	breaking?: boolean;
	/** Contributor username (from GitHub auto-generated) */
	author?: string;
	/** PR URL for reference */
	prUrl?: string;
	/** Quality score (0-1) from item validation */
	score?: number;
}

/**
 * Format types supported by the extraction layer
 */
export type FormatType =
	| "changesets"
	| "keep-a-changelog"
	| "github-auto-generated"
	| "gitlab-official"
	| "conventional-commits"
	| "generic";

/**
 * Result of extracting items from a changelog body.
 * Contains all items with their metadata, plus format information.
 */
export interface ExtractedRelease {
	/** All items extracted from the changelog */
	items: ExtractedItem[];
	/** Metadata about the extraction */
	metadata: {
		/** Detected format of the changelog */
		format: FormatType;
		/** Confidence in format detection (0-1) */
		formatConfidence: number;
		/** Summary/title extracted from the release */
		summary?: string;
		/** Release title if available */
		title?: string;
	};
}

/**
 * Confidence level for categorization decisions
 */
export type CategorizationConfidence = "high" | "medium" | "low";

/**
 * Result of categorizing a single item
 */
export interface CategorizationResult {
	/** The determined category */
	categoryId: CategoryId;
	/** How confident we are in this categorization */
	confidence: CategorizationConfidence;
	/** Why this category was chosen */
	reason:
		| "explicit_breaking"
		| "conventional_commit"
		| "section_hint"
		| "keyword_match"
		| "source_hint"
		| "no_signal";
}
