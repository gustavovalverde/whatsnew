/**
 * Pipeline exports for data aggregation
 */

export { fetchCommits, mergeWithCommits } from "./augment-commits.js";
export { enhanceWithAI } from "./enhance-with-ai.js";
export { fetchPrimary } from "./fetch-primary.js";
export { filterLowQualityItems, filterQuality } from "./filter-quality.js";
export { mergeSources } from "./merge-sources.js";
export {
	addSource,
	type CategoryMap,
	createPipelineContext,
	hasValidResult,
	type PipelineContext,
	type PipelineDependencies,
} from "./types.js";
