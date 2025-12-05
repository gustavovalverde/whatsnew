/**
 * Main categorization function
 *
 * Converts extracted items into WNF categories.
 */

import type {
	Category,
	CategoryId,
	ChangeItem,
	ExtractedItem,
} from "@whatsnew/types";
import { inferItemCategory } from "./inference.js";
import { CATEGORY_PRIORITY, CATEGORY_TITLES } from "./signals.js";

/**
 * Categorizes extracted items into WNF categories.
 *
 * This is the universal categorization function that processes ALL items
 * through the same 4-tier inference logic, ensuring consistent results
 * regardless of the source format.
 *
 * @param items - Extracted items from any changelog format
 * @returns Categories array ready for WNF document
 */
export function categorizeItems(items: ExtractedItem[]): Category[] {
	const categoryMap = new Map<CategoryId, ChangeItem[]>();

	for (const item of items) {
		// Infer category using 4-tier analysis
		const result = inferItemCategory(item);

		// Convert ExtractedItem to ChangeItem
		const changeItem: ChangeItem = {
			text: item.text,
			refs: item.refs,
		};

		// Add optional fields if present
		if (item.scope) {
			changeItem.scope = item.scope;
		}

		// Propagate quality score if available
		if (item.score !== undefined) {
			changeItem.score = item.score;
		}

		// Item is breaking if explicitly flagged OR categorized as breaking
		if (item.breaking || result.categoryId === "breaking") {
			changeItem.breaking = true;
		}

		// Add to appropriate category
		const categoryId = result.categoryId;
		if (!categoryMap.has(categoryId)) {
			categoryMap.set(categoryId, []);
		}
		categoryMap.get(categoryId)?.push(changeItem);
	}

	// Build result in priority order
	const result: Category[] = [];
	for (const id of CATEGORY_PRIORITY) {
		const categoryItems = categoryMap.get(id);
		if (categoryItems && categoryItems.length > 0) {
			result.push({
				id,
				title: CATEGORY_TITLES[id],
				items: categoryItems,
			});
		}
	}

	return result;
}
