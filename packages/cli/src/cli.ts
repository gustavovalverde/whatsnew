/**
 * Core CLI logic
 */

import { ReleaseService } from "@whatsnew/core";
import { filterCategories } from "@whatsnew/parsers";
import type {
	CategoryFilter,
	WNFAggregatedDocument,
	WNFDocument,
} from "@whatsnew/types";
import { type ParsedArgs, parseArgs, parseTarget } from "./args.js";
import { runConfigCommand } from "./commands/config.js";
import {
	getConfigPathDisplay,
	resolveConfig,
	warnIfRoot,
} from "./config/index.js";
import { type FormatType, format } from "./formatters/index.js";
import { parseRange, type RangeQuery } from "./range-parser.js";
import { colors } from "./utils/colors.js";
import { CLIError } from "./utils/errors.js";

// Injected at build time via --define, with runtime fallback for dev/test
declare const __VERSION__: string;
const VERSION = (() => {
	if (typeof __VERSION__ !== "undefined") return __VERSION__;
	try {
		// Fallback for dev/test: read from package.json
		const { createRequire } = require("node:module");
		const req = createRequire(import.meta.url);
		return req("../package.json").version;
	} catch {
		return "dev";
	}
})();

function getHelpText(): string {
	return `
${colors.bold("whatsnew")} - See what changed in your dependencies

${colors.bold("USAGE")}
  whatsnew <repo>                    Show latest release
  whatsnew <repo>@<version>          Show specific version
  whatsnew <repo>@HEAD               Show unreleased changes
  whatsnew <repo> --since <value>    Show changes since version or date
  whatsnew config <command>          Manage configuration

${colors.bold("ARGUMENTS")}
  <repo>                             GitHub repo (owner/repo format)

${colors.bold("UNRELEASED OPTIONS")}
  --unreleased, -u                   Show changes since last release (HEAD)
  --include-prerelease               Include pre-releases when finding baseline

${colors.bold("RANGE OPTIONS")} ${colors.dim("(auto-detects date vs version)")}
  --since, --from <value>            Starting point (e.g., v3.0.0 or 2024-06)
  --until, --to <value>              Ending point (default: latest/today)

${colors.bold("FILTER OPTIONS")}
  --important, -i                    Show only important changes (breaking, security, features, fixes, perf)
  --filter <type>                    Filter by type: important, maintenance, all (default)

${colors.bold("OTHER OPTIONS")}
  --package, -p <name>               Filter monorepo by package name
  --format, -f <type>                Output format: text, json, markdown
  --github-token <token>             Override GitHub token for this command
  --ai-key <key>                     Override AI API key for this command
  --help, -h                         Show this help message
  --version, -v                      Show version

${colors.bold("CONFIG COMMANDS")}
  config set <key> <value>           Set a configuration value
  config list                        Show current configuration
  config path                        Show configuration file path
  config unset <key>                 Remove a configuration value

${colors.bold("EXAMPLES")}
  ${colors.dim("# First-time setup")}
  whatsnew config set github_token ghp_xxxxxxxxxxxx
  whatsnew config set ai.api_key sk-ant-xxxxxxxxxxxx

  ${colors.dim("# Latest release")}
  whatsnew vercel/ai

  ${colors.dim("# Specific version")}
  whatsnew vercel/ai@v4.0.0

  ${colors.dim("# Unreleased changes (since last release)")}
  whatsnew vercel/ai --unreleased
  whatsnew vercel/ai@HEAD
  whatsnew vercel/ai@unreleased

  ${colors.dim("# Unreleased including pre-releases as baseline")}
  whatsnew vercel/ai -u --include-prerelease

  ${colors.dim("# Changes since version")}
  whatsnew vercel/ai --since v3.0.0

  ${colors.dim("# Changes since date")}
  whatsnew vercel/ai --since 2024
  whatsnew vercel/ai --since 2024-06

  ${colors.dim("# Version range")}
  whatsnew vercel/ai --from v3.0.0 --to v4.0.0

  ${colors.dim("# Monorepo package")}
  whatsnew vercel/ai --package @ai-sdk/anthropic

  ${colors.dim("# JSON output")}
  whatsnew vercel/ai --format json

${colors.bold("CONFIGURATION")}
  Tokens can be set via config file, environment variables, or CLI flags.
  Priority: CLI flags > environment variables > config file

  ${colors.dim(`Config file: ${getConfigPathDisplay()}`)}

${colors.bold("ENVIRONMENT")}
  GITHUB_TOKEN                       GitHub API token for higher rate limits
  NO_COLOR                           Disable colored output

${colors.bold("AI ENHANCEMENT")} ${colors.dim("(optional - improves results for poorly-documented repos)")}
  ANTHROPIC_API_KEY                  Enable AI fallback with Anthropic
  OPENAI_API_KEY                     Enable AI fallback with OpenAI
  AI_GATEWAY_API_KEY                 Enable AI fallback with Vercel AI Gateway

  ${colors.dim("AI auto-enables when a key is set. Only runs when parsing quality is low.")}
`;
}

export async function run(argv: string[]): Promise<void> {
	// Warn if running as root
	warnIfRoot();

	const args = parseArgs(argv);

	// Handle config subcommand
	if (args.command === "config") {
		await runConfigCommand(args.commandArgs);
		return;
	}

	if (args.help) {
		console.log(getHelpText());
		return;
	}

	if (args.version) {
		console.log(`whatsnew v${VERSION}`);
		return;
	}

	if (args.targets.length === 0) {
		throw new CLIError(
			"No repository specified",
			"Usage: whatsnew <owner/repo>\n\nRun 'whatsnew --help' for more information.",
		);
	}

	// For now, handle one target at a time
	const target = args.targets[0];
	const {
		repo,
		version: inlineVersion,
		unreleased: targetUnreleased,
	} = parseTarget(target);

	// Validate repo format
	if (!repo.includes("/")) {
		throw new CLIError(
			`Invalid repository format: ${repo}`,
			"Use owner/repo format, e.g., vercel/ai",
		);
	}

	const [owner, repoName] = repo.split("/");

	// Resolve configuration from all sources
	const config = await resolveConfig({
		githubToken: args.githubToken,
		aiKey: args.aiKey,
	});

	// Initialize service with resolved config
	const service = new ReleaseService({
		token: config.githubToken,
		enableFallback: true,
	});

	let result: WNFDocument | WNFAggregatedDocument;

	// Determine if unreleased mode (from flag or target syntax)
	const isUnreleasedMode = args.unreleased || targetUnreleased;

	// Determine what to fetch
	if (isUnreleasedMode) {
		// Unreleased mode: get commits since last release
		const { document } = await service.getUnreleasedChanges(owner, repoName, {
			includePrerelease: args.includePrerelease,
			packageFilter: args.package,
		});
		result = document;
	} else if (inlineVersion) {
		// Specific version: whatsnew vercel/ai@v4.0.0
		result = await service.getReleaseByTagWNF(owner, repoName, inlineVersion);
	} else if (args.since || args.until) {
		// Range query
		const range = parseRange(args.since, args.until);
		if (range) {
			result = await fetchRange(service, owner, repoName, range, args);
		} else {
			result = await service.getLatestReleaseWNF(owner, repoName, args.package);
		}
	} else {
		// Latest release with smart hint
		result = await fetchLatestWithHint(service, owner, repoName, args);
	}

	// Apply category filter if specified
	if (args.filter && args.filter !== "all") {
		result = applyFilter(result, args.filter);
	}

	// Format and output
	const output = format(result, args.format as FormatType);
	console.log(output);
}

/**
 * Apply category filter to WNF result
 */
function applyFilter(
	doc: WNFDocument | WNFAggregatedDocument,
	filter: Exclude<CategoryFilter, "all">,
): WNFDocument | WNFAggregatedDocument {
	if ("packages" in doc) {
		// Aggregated document - filter each package's categories
		return {
			...doc,
			packages: doc.packages
				.map((pkg) => ({
					...pkg,
					categories: filterCategories(pkg.categories, filter),
				}))
				.filter((pkg) => pkg.categories.length > 0),
		};
	}

	// Single release document
	return {
		...doc,
		categories: filterCategories(doc.categories, filter),
	};
}

/**
 * Fetch releases for a range query (date or version)
 */
async function fetchRange(
	service: ReleaseService,
	owner: string,
	repo: string,
	range: RangeQuery,
	args: ParsedArgs,
): Promise<WNFDocument | WNFAggregatedDocument> {
	if (range.type === "date") {
		// Date range - use existing getReleasesInRange
		return service.getReleasesInRange(owner, repo, {
			since: range.since as Date,
			until: range.until as Date,
			packageFilter: args.package,
		});
	}

	// Version range - need to resolve versions to dates
	const github = service.getGitHubClient();

	// Get the starting version release to find its date
	const sinceTag = range.since as string;
	const untilTag = range.until as string;

	if (untilTag === "latest" && !sinceTag) {
		// Just latest
		return service.getLatestReleaseWNF(owner, repo, args.package);
	}

	// Fetch releases and filter by version
	// For simplicity in MVP, we fetch recent releases and filter
	const releases = await github.getRecentReleases(owner, repo, {
		perPage: 100,
		packageFilter: args.package,
	});

	if (releases.length === 0) {
		throw new CLIError(
			"No releases found",
			`Repository ${owner}/${repo} has no releases.`,
		);
	}

	// Find the index of since and until tags
	const sinceIndex = sinceTag
		? releases.findIndex(
				(r) => r.tag_name === sinceTag || r.tag_name === `v${sinceTag}`,
			)
		: releases.length - 1;

	const untilIndex =
		untilTag === "latest"
			? 0
			: releases.findIndex(
					(r) => r.tag_name === untilTag || r.tag_name === `v${untilTag}`,
				);

	if (sinceTag && sinceIndex === -1) {
		throw new CLIError(
			`Version not found: ${sinceTag}`,
			`Available recent versions: ${releases
				.slice(0, 5)
				.map((r) => r.tag_name)
				.join(", ")}`,
		);
	}

	if (untilTag !== "latest" && untilIndex === -1) {
		throw new CLIError(
			`Version not found: ${untilTag}`,
			`Available recent versions: ${releases
				.slice(0, 5)
				.map((r) => r.tag_name)
				.join(", ")}`,
		);
	}

	// Get releases in range (releases are sorted newest first)
	const startIdx = Math.min(sinceIndex, untilIndex);
	const endIdx = Math.max(sinceIndex, untilIndex);
	const releasesInRange = releases.slice(startIdx, endIdx + 1);

	if (releasesInRange.length === 0) {
		throw new CLIError(
			"No releases in range",
			`No releases found between ${sinceTag} and ${untilTag}.`,
		);
	}

	if (releasesInRange.length === 1) {
		// Single release - return as WNFDocument
		return service.getReleaseByTagWNF(owner, repo, releasesInRange[0].tag_name);
	}

	// Multiple releases - use date range based on the releases we found
	const sinceDate = new Date(
		releasesInRange[releasesInRange.length - 1].published_at,
	);
	const untilDate = new Date(releasesInRange[0].published_at);

	return service.getReleasesInRange(owner, repo, {
		since: sinceDate,
		until: untilDate,
		packageFilter: args.package,
	});
}

/**
 * Hint about unreleased commits for stale releases
 */
export interface UnreleasedHint {
	type: "unreleased_commits";
	message: string;
	suggestion: string;
	commitCount: number;
	daysSinceRelease: number;
}

/** Extended WNFDocument with optional hint */
export type WNFDocumentWithHint = WNFDocument & { hint?: UnreleasedHint };

/**
 * Fetch latest release and add smart hint about unreleased commits
 * Shows hint when release is older than 30 days
 */
async function fetchLatestWithHint(
	service: ReleaseService,
	owner: string,
	repo: string,
	args: ParsedArgs,
): Promise<WNFDocumentWithHint> {
	const result = (await service.getLatestReleaseWNF(
		owner,
		repo,
		args.package,
	)) as WNFDocumentWithHint;

	// Check for smart hint: release > 30 days old
	if (result.releasedAt) {
		const releaseDate = new Date(result.releasedAt);
		const daysSinceRelease = Math.floor(
			(Date.now() - releaseDate.getTime()) / (1000 * 60 * 60 * 24),
		);

		if (daysSinceRelease > 30) {
			try {
				const unreleasedCount = await service.getUnreleasedCommitCount(
					owner,
					repo,
					result.source.tag,
				);

				if (unreleasedCount > 0) {
					result.hint = {
						type: "unreleased_commits",
						message: `${unreleasedCount} commits since this release (${daysSinceRelease} days ago)`,
						suggestion: `Use --unreleased or ${owner}/${repo}@HEAD to see them`,
						commitCount: unreleasedCount,
						daysSinceRelease,
					};
				}
			} catch {
				// Silently ignore hint errors - it's just a convenience feature
			}
		}
	}

	return result;
}
