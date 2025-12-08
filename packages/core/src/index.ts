// Services

// Re-export types for convenience
export type {
	Category,
	ChangeItem,
	GitHubComparison,
	GitHubFileContent,
	GitHubTag,
	ReleaseSummary,
	ReleasesInRangeOptions,
	SourceResult,
	WNFAggregatedDocument,
	WNFDocument,
} from "@whatsnew/types";
// Aggregator
export {
	DataAggregator,
	type DataAggregatorOptions,
} from "./aggregator/index.js";
// AI Smart Fallback
export {
	type AIConfig,
	type AIExtractionResult,
	AIExtractor,
	type AIProvider,
	DEFAULT_MODELS,
	type FallbackReason,
	type QualityAssessment,
	QualityAssessor,
	WNFExtractionSchema,
} from "./ai/index.js";
// Integrations
export {
	GitHubClient,
	type GitHubClientOptions,
} from "./integrations/github-client.js";
export {
	ReleaseService,
	type ReleaseServiceOptions,
	type UnreleasedResult,
} from "./services/release.service.js";
// Sources
export {
	ChangelogFileSource,
	CommitHistorySource,
	type DataSource,
	type DataSourceOptions,
	GitHubReleaseSource,
	QUALITY_THRESHOLDS,
} from "./sources/index.js";
// Utilities
export { extractSummary, formatCategoryTitle } from "./utils/metadata.js";
