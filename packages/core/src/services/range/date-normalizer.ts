/**
 * Date normalization utilities for release range queries
 */

export interface NormalizedDateRange {
	since: Date;
	until: Date;
}

/**
 * Normalizes date range inputs to Date objects.
 * Handles both string and Date inputs.
 *
 * @param since - Start date (string or Date)
 * @param until - End date (string or Date), defaults to now
 * @returns Normalized date range with Date objects
 */
export function normalizeDateRange(
	since: string | Date,
	until?: string | Date,
): NormalizedDateRange {
	const normalizedSince = typeof since === "string" ? new Date(since) : since;

	const normalizedUntil = until
		? typeof until === "string"
			? new Date(until)
			: until
		: new Date();

	return {
		since: normalizedSince,
		until: normalizedUntil,
	};
}
