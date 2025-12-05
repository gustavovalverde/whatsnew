/**
 * Range parsing with auto-detection of date vs version
 *
 * Date patterns:
 *   2024         -> 2024-01-01
 *   2024-06      -> 2024-06-01
 *   2024-06-15   -> 2024-06-15
 *
 * Everything else is treated as a version/tag.
 */

import { isValid, parseISO, startOfDay } from "date-fns";

/**
 * Pattern to detect date-like strings:
 * - YYYY (4 digits)
 * - YYYY-MM (4 digits, dash, 2 digits)
 * - YYYY-MM-DD (full ISO date)
 */
const DATE_PATTERN = /^\d{4}(-\d{2})?(-\d{2})?$/;

export interface RangeQuery {
	type: "version" | "date";
	since: string | Date;
	until: string | Date;
}

/**
 * Check if a string looks like a date
 */
export function isDateLike(value: string): boolean {
	return DATE_PATTERN.test(value);
}

/**
 * Expand partial date to full ISO date
 * - "2024" -> "2024-01-01"
 * - "2024-06" -> "2024-06-01"
 * - "2024-06-15" -> "2024-06-15"
 */
export function expandPartialDate(input: string): Date {
	// parseISO handles partial dates:
	// "2024" -> Jan 1, 2024
	// "2024-06" -> June 1, 2024
	const date = parseISO(input);

	if (!isValid(date)) {
		throw new Error(
			`Invalid date format: ${input}. Use YYYY, YYYY-MM, or YYYY-MM-DD.`,
		);
	}

	return startOfDay(date);
}

/**
 * Parse range flags into a structured query
 * Auto-detects whether values are dates or versions
 */
export function parseRange(since?: string, until?: string): RangeQuery | null {
	if (!since && !until) {
		return null;
	}

	const sinceIsDate = since ? isDateLike(since) : false;
	const untilIsDate = until ? isDateLike(until) : false;

	// If either is a date, treat as date range
	if (sinceIsDate || untilIsDate) {
		return {
			type: "date",
			since: since ? expandPartialDate(since) : new Date(0),
			until: until ? expandPartialDate(until) : startOfDay(new Date()),
		};
	}

	// Otherwise, treat as version range
	return {
		type: "version",
		since: since ?? "",
		until: until ?? "latest",
	};
}

/**
 * Format a date for display
 */
export function formatDate(date: Date): string {
	return date.toISOString().split("T")[0];
}
