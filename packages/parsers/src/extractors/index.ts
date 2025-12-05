/**
 * Extractors Module
 *
 * Provides format-specific extraction functions that extract items
 * from various changelog formats WITHOUT categorizing them.
 *
 * Categorization is handled separately by the universal categorizer.
 */

export { extractChangesets } from "./changesets.js";
export { extractConventionalCommits } from "./conventional-commits.js";
export { extractGeneric } from "./generic.js";
export { extractGitHubAuto } from "./github-auto.js";
export { extractGitLabOfficial } from "./gitlab-official.js";
export { extractKeepAChangelog } from "./keep-a-changelog.js";
