/**
 * Phase 2: Augment with commit history
 */

import { CATEGORY_PRIORITY } from "@whatsnew/parsers";
import type { SourceResult } from "@whatsnew/types";
import { normalizeForDeduplication } from "@whatsnew/utils";
import type { DataSource } from "../../sources/index.js";
import { addSource, type CategoryMap, type PipelineContext } from "./types.js";

/**
 * Fetches commit history for augmentation.
 * Always attempts to add commit data to catch undocumented changes.
 *
 * @param ctx - Pipeline context
 * @param sources - Available data sources
 * @returns Updated context with commit result
 */
export async function fetchCommits(
	ctx: PipelineContext,
	sources: readonly DataSource[],
): Promise<PipelineContext> {
	const commitSource = sources.find((s) => s.name === "commits");
	if (!commitSource) {
		return ctx;
	}

	try {
		const commitResult = await commitSource.fetch(ctx.owner, ctx.repo, ctx.tag);

		if (commitResult && commitResult.categories.length > 0) {
			return {
				...addSource(ctx, "commits"),
				commitResult,
			};
		}
	} catch (_error) {
		// Commit history is optional augmentation, don't fail
	}

	return ctx;
}

/**
 * Merges primary result with commit history.
 * Deduplicates by matching PR numbers and similar text.
 *
 * @param primary - Primary result from release notes/changelog
 * @param commits - Commit history result
 * @returns Merged source result
 */
export function mergeWithCommits(
	primary: SourceResult,
	commits: SourceResult,
): SourceResult {
	// Collect all refs from primary source for deduplication
	const primaryRefs = new Set<string>();
	const primaryTexts = new Set<string>();

	for (const cat of primary.categories) {
		for (const item of cat.items) {
			if (item.refs) {
				for (const ref of item.refs) {
					primaryRefs.add(ref);
				}
			}
			primaryTexts.add(normalizeForDeduplication(item.text));
		}
	}

	// Build merged category map starting with primary
	const categoryMap: CategoryMap = new Map();
	for (const cat of primary.categories) {
		categoryMap.set(cat.id, { ...cat, items: [...cat.items] });
	}

	// Add items from commits that aren't in primary
	for (const cat of commits.categories) {
		for (const item of cat.items) {
			// Skip if this ref is already in primary
			const hasMatchingRef = item.refs?.some((ref) => primaryRefs.has(ref));
			if (hasMatchingRef) {
				continue;
			}

			// Skip if text is too similar to existing item
			const normalizedText = normalizeForDeduplication(item.text);
			if (primaryTexts.has(normalizedText)) {
				continue;
			}

			// This is a new item from commits - add it
			if (!categoryMap.has(cat.id)) {
				categoryMap.set(cat.id, {
					id: cat.id,
					title: cat.title,
					items: [],
				});
			}
			categoryMap.get(cat.id)?.items.push(item);

			// Track for future deduplication
			if (item.refs) {
				for (const ref of item.refs) {
					primaryRefs.add(ref);
				}
			}
			primaryTexts.add(normalizedText);
		}
	}

	// Sort categories by priority order
	const sortedCategories = Array.from(categoryMap.values()).sort((a, b) => {
		const aIndex = CATEGORY_PRIORITY.indexOf(a.id);
		const bIndex = CATEGORY_PRIORITY.indexOf(b.id);
		return aIndex - bIndex;
	});

	return {
		...primary,
		categories: sortedCategories,
		confidence: Math.max(primary.confidence, commits.confidence),
		metadata: primary.metadata,
	};
}
