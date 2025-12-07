/**
 * Category filtering logic
 */

import type { Category, CategoryFilter } from "@whatsnew/types";
import { IMPORTANT_CATEGORIES, MAINTENANCE_CATEGORIES } from "./signals.js";

/**
 * Filters categories based on importance level.
 *
 * Breaking override: Items with breaking=true surface in the "important" filter
 * regardless of their assigned category.
 *
 * @param categories - Categories to filter
 * @param filter - Filter type: "important", "maintenance", or "all"
 * @returns Filtered categories with items adjusted based on filter
 */
export function filterCategories(
	categories: Category[],
	filter: CategoryFilter = "all",
): Category[] {
	if (filter === "all") {
		return categories;
	}

	return categories
		.map((category) => {
			if (filter === "important") {
				// Include if this is an important category
				if (IMPORTANT_CATEGORIES.includes(category.id)) {
					return category;
				}
				// For non-important categories, only include breaking items
				const breakingItems = category.items.filter((item) => item.breaking);
				if (breakingItems.length > 0) {
					return { ...category, items: breakingItems };
				}
				return null;
			}

			// maintenance filter: include only maintenance categories
			// but exclude breaking items (they belong in important view)
			if (MAINTENANCE_CATEGORIES.includes(category.id)) {
				const nonBreakingItems = category.items.filter(
					(item) => !item.breaking,
				);
				if (nonBreakingItems.length > 0) {
					return { ...category, items: nonBreakingItems };
				}
			}
			return null;
		})
		.filter((c): c is Category => c !== null && c.items.length > 0);
}

/**
 * Check if a category is considered important/user-facing
 *
 * @param categoryId - The category ID to check
 * @returns true if the category is in the important list
 */
export function isImportantCategory(categoryId: Category["id"]): boolean {
	return IMPORTANT_CATEGORIES.includes(categoryId);
}

/**
 * Check if a category is considered maintenance/internal
 *
 * @param categoryId - The category ID to check
 * @returns true if the category is in the maintenance list
 */
export function isMaintenanceCategory(categoryId: Category["id"]): boolean {
	return MAINTENANCE_CATEGORIES.includes(categoryId);
}
