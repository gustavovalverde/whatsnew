"use server";

import { ReleaseService, type UnreleasedResult } from "@whatsnew/core";
import type { WNFAggregatedDocument, WNFDocument } from "@whatsnew/types";
import { unstable_cache } from "next/cache";

/** Fallback metadata when unreleased commits are shown instead of releases */
export interface FallbackInfo {
	repo: string;
	reason: "no_releases" | "no_releases_in_range";
	commitCount: number;
}

/** Explicit unreleased request info (different from fallback - this was intentional) */
export interface UnreleasedInfo {
	repo: string;
	commitCount: number;
	baselineTag?: string;
}

export type ChangelogResult =
	| {
			success: true;
			data: (WNFDocument | WNFAggregatedDocument)[];
			fallback?: FallbackInfo[];
			unreleased?: UnreleasedInfo[];
	  }
	| { success: false; error: string };

// Cache duration: 1 hour (3600 seconds)
const CACHE_TTL = 3600;

/**
 * Cached function for fetching latest release
 */
const getCachedLatestRelease = unstable_cache(
	async (owner: string, repo: string, pkg?: string): Promise<WNFDocument> => {
		const releaseService = new ReleaseService({
			token: process.env.GITHUB_TOKEN,
		});
		return releaseService.getLatestReleaseWNF(owner, repo, pkg);
	},
	["latest-release"],
	{ revalidate: CACHE_TTL, tags: ["changelog"] },
);

/**
 * Cached function for fetching releases in a range
 */
const getCachedReleasesInRange = unstable_cache(
	async (
		owner: string,
		repo: string,
		since: string,
		until?: string,
		pkg?: string,
	): Promise<WNFAggregatedDocument> => {
		const releaseService = new ReleaseService({
			token: process.env.GITHUB_TOKEN,
		});
		return releaseService.getReleasesInRange(owner, repo, {
			since,
			until,
			packageFilter: pkg,
		});
	},
	["releases-range"],
	{ revalidate: CACHE_TTL, tags: ["changelog"] },
);

/**
 * Cached function for fetching unreleased changes (commits since last release)
 */
const getCachedUnreleasedChanges = unstable_cache(
	async (
		owner: string,
		repo: string,
		pkg?: string,
	): Promise<UnreleasedResult> => {
		const releaseService = new ReleaseService({
			token: process.env.GITHUB_TOKEN,
		});
		return releaseService.getUnreleasedChanges(owner, repo, {
			packageFilter: pkg,
		});
	},
	["unreleased-changes"],
	{ revalidate: CACHE_TTL, tags: ["changelog"] },
);

/**
 * Check if a result has no actual changes (empty categories)
 */
function isEmptyResult(result: WNFDocument | WNFAggregatedDocument): boolean {
	if ("packages" in result) {
		// Aggregated document - check if all packages have empty categories
		return result.packages.every((pkg) =>
			pkg.categories.every((cat) => cat.items.length === 0),
		);
	}
	// Single document - check if all categories are empty
	return result.categories.every((cat) => cat.items.length === 0);
}

export async function getChangelog(
	_prevState: ChangelogResult,
	formData: FormData,
): Promise<ChangelogResult> {
	const reposString = formData.get("repos") as string;
	const since = formData.get("since") as string;
	const until = formData.get("until") as string;
	const pkg = formData.get("package") as string;
	const unreleased = formData.get("unreleased") === "true";

	if (!reposString) {
		return { success: false, error: "At least one repository is required" };
	}

	// Split comma-separated repos and filter empty entries
	const repoList = reposString
		.split(",")
		.map((r) => r.trim())
		.filter(Boolean);

	if (repoList.length === 0) {
		return { success: false, error: "At least one repository is required" };
	}

	// Validate all repos have correct format
	const invalidRepos = repoList.filter((r) => {
		const [owner, repo] = r.split("/");
		return !owner || !repo;
	});

	if (invalidRepos.length > 0) {
		return {
			success: false,
			error: `Invalid repository format: ${invalidRepos.join(", ")}. Use owner/repo`,
		};
	}

	try {
		// Fetch all repos in parallel, with fallback to unreleased changes
		const resultsWithMetadata = await Promise.all(
			repoList.map(async (repoStr) => {
				const [owner, repo] = repoStr.split("/");

				// Explicit unreleased mode - directly fetch unreleased, no fallback needed
				if (unreleased) {
					const { document, metadata } = await getCachedUnreleasedChanges(
						owner,
						repo,
						pkg || undefined,
					);
					return {
						data: document,
						unreleased: {
							repo: `${owner}/${repo}`,
							commitCount: metadata.commitCount,
							baselineTag: metadata.baselineTag,
						},
						fallback: undefined,
					};
				}

				// Regular mode with fallback to unreleased
				try {
					let result: WNFDocument | WNFAggregatedDocument;

					if (since) {
						result = await getCachedReleasesInRange(
							owner,
							repo,
							since,
							until || undefined,
							pkg || undefined,
						);
					} else {
						result = await getCachedLatestRelease(
							owner,
							repo,
							pkg || undefined,
						);
					}

					// Check if result is empty (no releases found)
					if (isEmptyResult(result)) {
						// Fallback to unreleased changes
						const { document, metadata } = await getCachedUnreleasedChanges(
							owner,
							repo,
							pkg || undefined,
						);
						return {
							data: document,
							fallback: {
								repo: `${owner}/${repo}`,
								reason: (since
									? "no_releases_in_range"
									: "no_releases") as FallbackInfo["reason"],
								commitCount: metadata.commitCount,
							},
							unreleased: undefined,
						};
					}

					return { data: result, fallback: undefined, unreleased: undefined };
				} catch {
					// If primary fetch fails (e.g., no releases), try unreleased as fallback
					const { document, metadata } = await getCachedUnreleasedChanges(
						owner,
						repo,
						pkg || undefined,
					);
					return {
						data: document,
						fallback: {
							repo: `${owner}/${repo}`,
							reason: "no_releases" as const,
							commitCount: metadata.commitCount,
						},
						unreleased: undefined,
					};
				}
			}),
		);

		// Separate results, fallback info, and unreleased info
		const data = resultsWithMetadata.map((r) => r.data);
		const fallbackList = resultsWithMetadata
			.filter((r) => r.fallback !== undefined)
			.map((r) => r.fallback as FallbackInfo);
		const unreleasedList = resultsWithMetadata
			.filter((r) => r.unreleased !== undefined)
			.map((r) => r.unreleased as UnreleasedInfo);

		return {
			success: true,
			data,
			fallback: fallbackList.length > 0 ? fallbackList : undefined,
			unreleased: unreleasedList.length > 0 ? unreleasedList : undefined,
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error occurred",
		};
	}
}
