/**
 * Range query helpers for release service
 */

export {
	type NormalizedDateRange,
	normalizeDateRange,
} from "./date-normalizer.js";
export {
	type AggregationResult,
	PackageAggregator,
	type ParsedRelease,
} from "./package-aggregator.js";
export {
	buildAggregatedSummary,
	buildCategorySummary,
} from "./summary-builder.js";
