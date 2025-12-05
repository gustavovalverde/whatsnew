/**
 * Test Repositories for E2E Validation
 *
 * This file contains a curated list of popular repositories used to validate
 * the WNF output quality. These repos represent different changelog formats,
 * release patterns, and use cases.
 *
 * Run with: bun run scripts/e2e/validate.ts
 */

export interface TestRepository {
	/** Platform: github or gitlab */
	platform: "github" | "gitlab";
	/** Repository owner/org */
	owner: string;
	/** Repository name */
	repo: string;
	/** Category for organization */
	category: string;
	/** Expected changelog format (helps validate detection) */
	expectedFormat?:
		| "changesets"
		| "keep-a-changelog"
		| "github-auto"
		| "conventional-commits"
		| "generic";
	/** Notes about this repo's release patterns */
	notes?: string;
	/** Whether this is a monorepo */
	monorepo?: boolean;
	/** Package name for monorepo filtering */
	packageFilter?: string;
}

/**
 * Curated list of 25 popular repositories for testing
 * Covering various formats, platforms, and release patterns
 */
export const TEST_REPOSITORIES: TestRepository[] = [
	// ==========================================================================
	// AI & ML Libraries
	// ==========================================================================
	{
		platform: "github",
		owner: "vercel",
		repo: "ai",
		category: "AI/ML",
		expectedFormat: "changesets",
		notes: "Vercel AI SDK - uses Changesets, monorepo",
		monorepo: true,
		packageFilter: "ai",
	},
	{
		platform: "github",
		owner: "anthropics",
		repo: "anthropic-sdk-python",
		category: "AI/ML",
		expectedFormat: "keep-a-changelog",
		notes: "Anthropic Python SDK",
	},
	{
		platform: "github",
		owner: "openai",
		repo: "openai-node",
		category: "AI/ML",
		expectedFormat: "keep-a-changelog",
		notes: "OpenAI Node.js SDK",
	},
	{
		platform: "github",
		owner: "langchain-ai",
		repo: "langchainjs",
		category: "AI/ML",
		expectedFormat: "github-auto",
		notes: "LangChain JS - auto-generated releases",
		monorepo: true,
	},

	// ==========================================================================
	// Frontend Frameworks
	// ==========================================================================
	{
		platform: "github",
		owner: "vercel",
		repo: "next.js",
		category: "Frontend",
		expectedFormat: "github-auto",
		notes: "Next.js - large auto-generated changelogs",
	},
	{
		platform: "github",
		owner: "facebook",
		repo: "react",
		category: "Frontend",
		expectedFormat: "generic",
		notes: "React - custom release format",
	},
	{
		platform: "github",
		owner: "vuejs",
		repo: "core",
		category: "Frontend",
		expectedFormat: "conventional-commits",
		notes: "Vue 3 - conventional commits",
	},
	{
		platform: "github",
		owner: "sveltejs",
		repo: "svelte",
		category: "Frontend",
		expectedFormat: "github-auto",
		notes: "Svelte - GitHub auto-generated",
	},
	{
		platform: "github",
		owner: "angular",
		repo: "angular",
		category: "Frontend",
		expectedFormat: "conventional-commits",
		notes: "Angular - strict conventional commits",
		monorepo: true,
	},

	// ==========================================================================
	// Backend & Runtime
	// ==========================================================================
	{
		platform: "github",
		owner: "honojs",
		repo: "hono",
		category: "Backend",
		expectedFormat: "github-auto",
		notes: "Hono - lightweight web framework",
	},
	{
		platform: "github",
		owner: "expressjs",
		repo: "express",
		category: "Backend",
		expectedFormat: "keep-a-changelog",
		notes: "Express.js - traditional changelog",
	},
	{
		platform: "github",
		owner: "fastify",
		repo: "fastify",
		category: "Backend",
		expectedFormat: "github-auto",
		notes: "Fastify - GitHub auto-generated",
	},
	{
		platform: "github",
		owner: "oven-sh",
		repo: "bun",
		category: "Runtime",
		expectedFormat: "generic",
		notes: "Bun runtime - detailed release notes",
	},
	{
		platform: "github",
		owner: "denoland",
		repo: "deno",
		category: "Runtime",
		expectedFormat: "generic",
		notes: "Deno runtime - markdown releases",
	},

	// ==========================================================================
	// Build Tools & Bundlers
	// ==========================================================================
	{
		platform: "github",
		owner: "vitejs",
		repo: "vite",
		category: "Build Tools",
		expectedFormat: "conventional-commits",
		notes: "Vite - conventional commits format",
	},
	{
		platform: "github",
		owner: "evanw",
		repo: "esbuild",
		category: "Build Tools",
		expectedFormat: "keep-a-changelog",
		notes: "esbuild - keep-a-changelog format",
	},
	{
		platform: "github",
		owner: "vercel",
		repo: "turborepo",
		category: "Build Tools",
		expectedFormat: "changesets",
		notes: "Turborepo - changesets format",
		monorepo: true,
	},

	// ==========================================================================
	// Popular Libraries
	// ==========================================================================
	{
		platform: "github",
		owner: "colinhacks",
		repo: "zod",
		category: "Libraries",
		expectedFormat: "github-auto",
		notes: "Zod - schema validation",
	},
	{
		platform: "github",
		owner: "TanStack",
		repo: "query",
		category: "Libraries",
		expectedFormat: "changesets",
		notes: "TanStack Query - changesets, monorepo",
		monorepo: true,
		packageFilter: "@tanstack/react-query",
	},
	{
		platform: "github",
		owner: "prisma",
		repo: "prisma",
		category: "Libraries",
		expectedFormat: "github-auto",
		notes: "Prisma ORM - detailed auto-generated",
	},
	{
		platform: "github",
		owner: "trpc",
		repo: "trpc",
		category: "Libraries",
		expectedFormat: "changesets",
		notes: "tRPC - changesets format, monorepo",
		monorepo: true,
	},
	{
		platform: "github",
		owner: "drizzle-team",
		repo: "drizzle-orm",
		category: "Libraries",
		expectedFormat: "github-auto",
		notes: "Drizzle ORM - GitHub releases",
	},

	// ==========================================================================
	// GitLab Projects
	// ==========================================================================
	{
		platform: "gitlab",
		owner: "gitlab-org",
		repo: "gitlab",
		category: "GitLab",
		expectedFormat: "generic",
		notes: "GitLab CE/EE - official GitLab format",
	},
	{
		platform: "gitlab",
		owner: "gitlab-org",
		repo: "cli",
		category: "GitLab",
		expectedFormat: "keep-a-changelog",
		notes: "GitLab CLI (glab)",
	},

	// ==========================================================================
	// Infrastructure & DevOps
	// ==========================================================================
	{
		platform: "github",
		owner: "hashicorp",
		repo: "terraform",
		category: "Infrastructure",
		expectedFormat: "keep-a-changelog",
		notes: "Terraform - traditional changelog",
	},
];

/**
 * Get repositories by category
 */
export function getByCategory(category: string): TestRepository[] {
	return TEST_REPOSITORIES.filter((r) => r.category === category);
}

/**
 * Get repositories by platform
 */
export function getByPlatform(
	platform: "github" | "gitlab",
): TestRepository[] {
	return TEST_REPOSITORIES.filter((r) => r.platform === platform);
}

/**
 * Get monorepo repositories
 */
export function getMonorepos(): TestRepository[] {
	return TEST_REPOSITORIES.filter((r) => r.monorepo);
}

/**
 * Get all unique categories
 */
export function getCategories(): string[] {
	return [...new Set(TEST_REPOSITORIES.map((r) => r.category))];
}

// Export count for quick reference
export const REPOSITORY_COUNT = TEST_REPOSITORIES.length;
