import type {
	GitHubCommit,
	GitHubComparison,
	GitHubFileContent,
	GitHubRelease,
	GitHubTag,
} from "@whatsnew/types";

const DEFAULT_HEADERS = {
	Accept: "application/vnd.github+json",
	"X-GitHub-Api-Version": "2022-11-28",
} satisfies Record<string, string>;

/** Default request timeout in milliseconds */
const DEFAULT_TIMEOUT_MS = 30_000;

/** Valid GitHub owner/repo name pattern */
const VALID_NAME_PATTERN = /^[a-zA-Z0-9._-]+$/;

/**
 * Error thrown when GitHub API rate limit is exceeded
 */
export class GitHubRateLimitError extends Error {
	constructor(
		public readonly limit: number,
		public readonly remaining: number,
		public readonly resetAt: Date,
	) {
		const resetIn = Math.ceil((resetAt.getTime() - Date.now()) / 1000 / 60);
		super(
			`GitHub API rate limit exceeded. Limit: ${limit}, Remaining: ${remaining}, Resets in: ${resetIn} minutes`,
		);
		this.name = "GitHubRateLimitError";
	}
}

/**
 * Error thrown when request times out
 */
export class GitHubTimeoutError extends Error {
	constructor(endpoint: string, timeoutMs: number) {
		super(`GitHub API request timed out after ${timeoutMs}ms: ${endpoint}`);
		this.name = "GitHubTimeoutError";
	}
}

/**
 * Error thrown for invalid input parameters
 */
export class GitHubValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "GitHubValidationError";
	}
}

export interface GitHubClientOptions {
	token?: string;
	baseUrl?: string;
	/** Request timeout in milliseconds (default: 30000) */
	timeoutMs?: number;
}

/**
 * GitHub API client with rate limit handling, timeouts, and input validation
 */
export class GitHubClient {
	readonly platform = "github" as const;

	private readonly baseUrl: string;
	private readonly token?: string;
	private readonly timeoutMs: number;

	/** Last known rate limit information */
	private rateLimitInfo: {
		limit: number;
		remaining: number;
		resetAt: Date;
	} | null = null;

	constructor(options: GitHubClientOptions = {}) {
		this.baseUrl = options.baseUrl || "https://api.github.com";
		this.token = options.token || process.env.GITHUB_TOKEN;
		this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	}

	/**
	 * Validate owner/repo names to prevent injection
	 */
	private validateRepoParams(owner: string, repo: string): void {
		if (!owner || !VALID_NAME_PATTERN.test(owner)) {
			throw new GitHubValidationError(
				`Invalid owner name: "${owner}". Must match pattern: ${VALID_NAME_PATTERN}`,
			);
		}
		if (!repo || !VALID_NAME_PATTERN.test(repo)) {
			throw new GitHubValidationError(
				`Invalid repo name: "${repo}". Must match pattern: ${VALID_NAME_PATTERN}`,
			);
		}
	}

	/**
	 * Check rate limit headers and throw if exceeded
	 */
	private checkRateLimit(response: Response): void {
		const limit = response.headers.get("X-RateLimit-Limit");
		const remaining = response.headers.get("X-RateLimit-Remaining");
		const reset = response.headers.get("X-RateLimit-Reset");

		if (limit && remaining && reset) {
			this.rateLimitInfo = {
				limit: Number.parseInt(limit, 10),
				remaining: Number.parseInt(remaining, 10),
				resetAt: new Date(Number.parseInt(reset, 10) * 1000),
			};

			// Throw if we're rate limited (status 403 with 0 remaining)
			if (response.status === 403 && this.rateLimitInfo.remaining === 0) {
				throw new GitHubRateLimitError(
					this.rateLimitInfo.limit,
					this.rateLimitInfo.remaining,
					this.rateLimitInfo.resetAt,
				);
			}
		}
	}

	/**
	 * Get current rate limit status
	 */
	getRateLimitStatus(): {
		limit: number;
		remaining: number;
		resetAt: Date;
	} | null {
		return this.rateLimitInfo;
	}

	private async fetch<T>(
		endpoint: string,
		options: RequestInit = {},
	): Promise<T> {
		const headers: Record<string, string> = {
			...DEFAULT_HEADERS,
			...(options.headers as Record<string, string>),
		};

		if (this.token) {
			headers.Authorization = `Bearer ${this.token}`;
		}

		let response: Response;
		try {
			response = await fetch(`${this.baseUrl}${endpoint}`, {
				...options,
				headers,
				signal: AbortSignal.timeout(this.timeoutMs),
			});
		} catch (error) {
			if (error instanceof Error && error.name === "TimeoutError") {
				throw new GitHubTimeoutError(endpoint, this.timeoutMs);
			}
			throw error;
		}

		// Check and update rate limit info
		this.checkRateLimit(response);

		if (!response.ok) {
			throw new Error(
				`GitHub API error: ${response.status} ${response.statusText}`,
			);
		}

		return response.json() as T;
	}

	/**
	 * Fetch with 404 handling - returns null instead of throwing
	 */
	private async fetchOrNull<T>(
		endpoint: string,
		options: RequestInit = {},
	): Promise<T | null> {
		const headers: Record<string, string> = {
			...DEFAULT_HEADERS,
			...(options.headers as Record<string, string>),
		};

		if (this.token) {
			headers.Authorization = `Bearer ${this.token}`;
		}

		let response: Response;
		try {
			response = await fetch(`${this.baseUrl}${endpoint}`, {
				...options,
				headers,
				signal: AbortSignal.timeout(this.timeoutMs),
			});
		} catch (error) {
			if (error instanceof Error && error.name === "TimeoutError") {
				throw new GitHubTimeoutError(endpoint, this.timeoutMs);
			}
			throw error;
		}

		// Check and update rate limit info
		this.checkRateLimit(response);

		if (response.status === 404) {
			return null;
		}

		if (!response.ok) {
			throw new Error(
				`GitHub API error: ${response.status} ${response.statusText}`,
			);
		}

		return response.json() as T;
	}

	async getLatestRelease(owner: string, repo: string): Promise<GitHubRelease> {
		this.validateRepoParams(owner, repo);
		return this.fetch<GitHubRelease>(`/repos/${owner}/${repo}/releases/latest`);
	}

	async getReleaseByTag(
		owner: string,
		repo: string,
		tag: string,
	): Promise<GitHubRelease> {
		this.validateRepoParams(owner, repo);
		return this.fetch<GitHubRelease>(
			`/repos/${owner}/${repo}/releases/tags/${encodeURIComponent(tag)}`,
		);
	}

	async getChangelog(
		owner: string,
		repo: string,
		path = "CHANGELOG.md",
	): Promise<string> {
		this.validateRepoParams(owner, repo);
		const response = await this.fetch<{ content: string }>(
			`/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`,
		);
		return Buffer.from(response.content, "base64").toString("utf-8");
	}

	async compareCommits(
		owner: string,
		repo: string,
		base: string,
		head: string,
	): Promise<GitHubCommit[]> {
		this.validateRepoParams(owner, repo);
		const response = await this.fetch<{ commits: GitHubCommit[] }>(
			`/repos/${owner}/${repo}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`,
		);
		return response.commits;
	}

	/**
	 * Fetch recent releases (for monorepo support)
	 * Simple: get last N releases, optionally filter by package name
	 */
	async getRecentReleases(
		owner: string,
		repo: string,
		options: { perPage?: number; packageFilter?: string } = {},
	): Promise<GitHubRelease[]> {
		this.validateRepoParams(owner, repo);
		const perPage = options.perPage || 30;
		const releases = await this.fetch<GitHubRelease[]>(
			`/repos/${owner}/${repo}/releases?per_page=${perPage}`,
		);

		// If package filter provided, match exact package name in tag
		if (options.packageFilter) {
			return releases.filter((r) => {
				const pkgName = this.extractPackageName(r.tag_name);
				return pkgName === options.packageFilter;
			});
		}

		return releases;
	}

	/**
	 * Detect if repository is a monorepo by checking tag patterns
	 * Simple heuristic: if we see multiple different package names in tags, it's a monorepo
	 */
	async detectMonorepo(
		owner: string,
		repo: string,
	): Promise<{ isMonorepo: boolean; packages: string[] }> {
		// Validation happens in getRecentReleases
		const releases = await this.getRecentReleases(owner, repo, {
			perPage: 50,
		});

		const packages = new Set<string>();

		for (const release of releases) {
			const packageName = this.extractPackageName(release.tag_name);
			if (packageName) {
				packages.add(packageName);
			}
		}

		return {
			isMonorepo: packages.size > 1,
			packages: Array.from(packages).sort(),
		};
	}

	/**
	 * Extract package name from tag
	 * Examples:
	 *   @scope/name@1.0.0 → @scope/name
	 *   name@1.0.0 → name
	 *   v1.0.0 → null (single package repo)
	 */
	private extractPackageName(tagName: string): string | null {
		// Pattern: @scope/name@version or name@version
		const match = tagName.match(/^(@?[^@]+)@/);
		return match ? match[1] : null;
	}

	/**
	 * Get latest release, returns null if no releases exist
	 */
	async getLatestReleaseOrNull(
		owner: string,
		repo: string,
	): Promise<GitHubRelease | null> {
		this.validateRepoParams(owner, repo);
		return this.fetchOrNull<GitHubRelease>(
			`/repos/${owner}/${repo}/releases/latest`,
		);
	}

	/**
	 * Fetch repository tags
	 */
	async getTags(
		owner: string,
		repo: string,
		options: { perPage?: number } = {},
	): Promise<GitHubTag[]> {
		this.validateRepoParams(owner, repo);
		const perPage = options.perPage || 30;
		return this.fetch<GitHubTag[]>(
			`/repos/${owner}/${repo}/tags?per_page=${perPage}`,
		);
	}

	/**
	 * Try to fetch file content from repository
	 * Returns null if file doesn't exist
	 */
	async getFileContentOrNull(
		owner: string,
		repo: string,
		path: string,
		ref?: string,
	): Promise<string | null> {
		this.validateRepoParams(owner, repo);
		const encodedPath = path
			.split("/")
			.map((segment) => encodeURIComponent(segment))
			.join("/");
		const endpoint = ref
			? `/repos/${owner}/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(ref)}`
			: `/repos/${owner}/${repo}/contents/${encodedPath}`;

		const response = await this.fetchOrNull<GitHubFileContent>(endpoint);
		if (!response || response.type !== "file") {
			return null;
		}

		return Buffer.from(response.content, "base64").toString("utf-8");
	}

	/**
	 * List contents of a directory in the repository
	 * Returns array of file/directory names
	 */
	async listDirectoryContents(
		owner: string,
		repo: string,
		path: string,
		ref?: string,
	): Promise<Array<{ name: string; type: "file" | "dir" }> | null> {
		this.validateRepoParams(owner, repo);
		const encodedPath = path
			.split("/")
			.map((segment) => encodeURIComponent(segment))
			.join("/");
		const endpoint = ref
			? `/repos/${owner}/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(ref)}`
			: `/repos/${owner}/${repo}/contents/${encodedPath}`;

		const response = await this.fetchOrNull<GitHubFileContent[]>(endpoint);

		if (!response || !Array.isArray(response)) {
			return null;
		}

		return response.map((item) => ({
			name: item.name,
			type: item.type === "dir" ? "dir" : "file",
		}));
	}

	/**
	 * Extract CHANGELOG path from release body markdown references
	 * Handles patterns like: [CHANGELOG.md](https://github.com/owner/repo/blob/tag/path/CHANGELOG.md)
	 */
	private extractChangelogPathFromBody(
		body: string,
		owner: string,
		repo: string,
	): string | null {
		// Pattern: [CHANGELOG.md](URL) or [CHANGELOG](URL)
		const linkPattern =
			/\[CHANGELOG(?:\.md)?\]\((https:\/\/github\.com\/[^)]+)\)/gi;
		const match = linkPattern.exec(body);

		if (!match) return null;

		const url = match[1];
		// Extract path: github.com/owner/repo/blob/ref/path/to/CHANGELOG.md
		const pathPattern = new RegExp(
			`github\\.com/${owner}/${repo}/blob/[^/]+/(.+)$`,
			"i",
		);
		const pathMatch = pathPattern.exec(url);

		return pathMatch ? pathMatch[1] : null;
	}

	/**
	 * Generate potential changelog paths based on package name
	 */
	private derivePackageChangelogPaths(packageName: string): string[] {
		// Handle scoped packages: @scope/name -> name
		const name = packageName.startsWith("@")
			? packageName.split("/")[1]
			: packageName;

		return [
			`packages/${name}/CHANGELOG.md`,
			`packages/${name}/CHANGELOG`,
			`packages/${packageName}/CHANGELOG.md`, // Try full scoped name
			`apps/${name}/CHANGELOG.md`,
			`libs/${name}/CHANGELOG.md`,
			`modules/${name}/CHANGELOG.md`,
		];
	}

	/**
	 * Discover changelog by enumerating common monorepo directories
	 * This is expensive (multiple API calls) and used as last resort
	 */
	private async discoverMonorepoChangelog(
		owner: string,
		repo: string,
		ref?: string,
	): Promise<{ content: string; path: string } | null> {
		const MONOREPO_DIRS = ["packages", "apps", "libs", "modules"];

		for (const dir of MONOREPO_DIRS) {
			const contents = await this.listDirectoryContents(owner, repo, dir, ref);
			if (!contents) continue;

			// Only check directories (skip files)
			const subdirs = contents.filter((item) => item.type === "dir");

			// Limit to first 10 to avoid excessive API calls
			for (const subdir of subdirs.slice(0, 10)) {
				const changelogPath = `${dir}/${subdir.name}/CHANGELOG.md`;
				const content = await this.getFileContentOrNull(
					owner,
					repo,
					changelogPath,
					ref,
				);
				if (content) {
					return { content, path: changelogPath };
				}
			}
		}

		return null;
	}

	/**
	 * Try multiple changelog file paths and return the first one found
	 * Uses tiered search strategy:
	 * 1. Extract path from release body reference (most efficient)
	 * 2. Package-aware lookup (if packageName provided)
	 * 3. Root-level paths (existing behavior)
	 * 4. Directory enumeration (if monorepo detected)
	 */
	async findChangelog(
		owner: string,
		repo: string,
		options: {
			ref?: string;
			packageName?: string;
			releaseBody?: string;
		} = {},
	): Promise<{ content: string; path: string } | null> {
		this.validateRepoParams(owner, repo);
		const { ref, packageName, releaseBody } = options;

		// TIER 1: Extract path from release body reference (most efficient)
		if (releaseBody) {
			const extractedPath = this.extractChangelogPathFromBody(
				releaseBody,
				owner,
				repo,
			);
			if (extractedPath) {
				const content = await this.getFileContentOrNull(
					owner,
					repo,
					extractedPath,
					ref,
				);
				if (content) {
					return { content, path: extractedPath };
				}
			}
		}

		// TIER 2: Package-aware paths (if packageName provided)
		if (packageName) {
			const packagePaths = this.derivePackageChangelogPaths(packageName);
			for (const path of packagePaths) {
				const content = await this.getFileContentOrNull(owner, repo, path, ref);
				if (content) {
					return { content, path };
				}
			}
		}

		// TIER 3: Root-level paths (existing behavior)
		const ROOT_CHANGELOG_FILES = [
			"CHANGELOG.md",
			"CHANGELOG",
			"HISTORY.md",
			"CHANGES.md",
			"NEWS.md",
			"RELEASES.md",
			"docs/CHANGELOG.md",
			"doc/CHANGELOG.md",
		];

		for (const path of ROOT_CHANGELOG_FILES) {
			const content = await this.getFileContentOrNull(owner, repo, path, ref);
			if (content) {
				return { content, path };
			}
		}

		// TIER 4: Directory enumeration (only if monorepo detected via release tags)
		// Smart detection: only enumerate if we detect this is a monorepo
		if (!packageName) {
			const monorepoInfo = await this.detectMonorepo(owner, repo);
			if (monorepoInfo.isMonorepo) {
				const discovered = await this.discoverMonorepoChangelog(
					owner,
					repo,
					ref,
				);
				if (discovered) {
					return discovered;
				}
			}
		}

		return null;
	}

	/**
	 * Compare two commits/tags and get full comparison data
	 */
	async compare(
		owner: string,
		repo: string,
		base: string,
		head: string,
	): Promise<GitHubComparison> {
		this.validateRepoParams(owner, repo);
		return this.fetch<GitHubComparison>(
			`/repos/${owner}/${repo}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`,
		);
	}

	/**
	 * Find the previous tag relative to a given tag
	 * Useful for determining the commit range for a release
	 */
	async findPreviousTag(
		owner: string,
		repo: string,
		currentTag: string,
	): Promise<string | null> {
		this.validateRepoParams(owner, repo);
		const tags = await this.getTags(owner, repo, { perPage: 50 });
		const tagNames = tags.map((t) => t.name);

		const currentIndex = tagNames.indexOf(currentTag);
		if (currentIndex === -1 || currentIndex === tagNames.length - 1) {
			return null;
		}

		return tagNames[currentIndex + 1];
	}

	/**
	 * Fetch releases within a date range with pagination
	 *
	 * @param owner - Repository owner
	 * @param repo - Repository name
	 * @param options - Query options
	 * @returns Array of releases within the date range
	 */
	async getReleasesInRange(
		owner: string,
		repo: string,
		options: {
			since: Date;
			until?: Date;
			packageFilter?: string;
			maxPages?: number;
		},
	): Promise<GitHubRelease[]> {
		this.validateRepoParams(owner, repo);
		const until = options.until ?? new Date();
		const maxPages = options.maxPages ?? 10;
		const perPage = 100;

		const allReleases: GitHubRelease[] = [];
		let page = 1;
		let foundOlderThanSince = false;

		while (page <= maxPages && !foundOlderThanSince) {
			const releases = await this.fetch<GitHubRelease[]>(
				`/repos/${owner}/${repo}/releases?per_page=${perPage}&page=${page}`,
			);

			if (releases.length === 0) {
				break;
			}

			for (const release of releases) {
				// Skip draft releases (published_at is null)
				if (!release.published_at) {
					continue;
				}

				const publishedAt = new Date(release.published_at);

				// Skip if before date range
				if (publishedAt < options.since) {
					foundOlderThanSince = true;
					break;
				}

				// Skip if after date range
				if (publishedAt > until) {
					continue;
				}

				// Apply package filter if specified
				if (options.packageFilter) {
					const pkgName = this.extractPackageName(release.tag_name);
					// Support glob-like patterns: "ai@*" matches "ai@5.0.0"
					if (options.packageFilter.endsWith("*")) {
						const prefix = options.packageFilter.slice(0, -1);
						if (!release.tag_name.startsWith(prefix)) {
							continue;
						}
					} else if (pkgName !== options.packageFilter) {
						continue;
					}
				}

				allReleases.push(release);
			}

			page++;
		}

		return allReleases;
	}

	/**
	 * Get the default branch name for a repository
	 */
	async getDefaultBranch(owner: string, repo: string): Promise<string> {
		this.validateRepoParams(owner, repo);
		const repoInfo = await this.fetch<{ default_branch: string }>(
			`/repos/${owner}/${repo}`,
		);
		return repoInfo.default_branch;
	}

	/**
	 * Compare a base ref (tag/commit) to HEAD (default branch)
	 * Used for getting unreleased commits since last release
	 */
	async compareToHead(
		owner: string,
		repo: string,
		base: string,
	): Promise<GitHubComparison> {
		this.validateRepoParams(owner, repo);
		const defaultBranch = await this.getDefaultBranch(owner, repo);
		return this.compare(owner, repo, base, defaultBranch);
	}

	/**
	 * Check if a tag represents a pre-release version
	 * Matches: rc, alpha, beta, canary, preview, dev, next, nightly
	 */
	private isPreReleaseTag(tag: string): boolean {
		const preReleasePatterns = [
			/-rc\./i,
			/-rc\d/i,
			/-alpha/i,
			/-beta/i,
			/-canary/i,
			/-preview/i,
			/-dev/i,
			/-next/i,
			/-nightly/i,
		];
		return preReleasePatterns.some((pattern) => pattern.test(tag));
	}

	/**
	 * Get the latest stable release (non-draft, non-prerelease)
	 * Returns null if no stable releases exist
	 */
	async getLatestStableRelease(
		owner: string,
		repo: string,
		options?: { packageFilter?: string },
	): Promise<GitHubRelease | null> {
		this.validateRepoParams(owner, repo);
		const releases = await this.getRecentReleases(owner, repo, {
			perPage: 30,
			packageFilter: options?.packageFilter,
		});

		// Find first non-prerelease, non-draft release
		for (const release of releases) {
			// Skip drafts (published_at is null for drafts)
			if (!release.published_at) {
				continue;
			}
			// Skip prereleases (both API flag and tag pattern)
			if (release.prerelease || this.isPreReleaseTag(release.tag_name)) {
				continue;
			}
			return release;
		}

		return null;
	}
}
