/**
 * Core CLI logic
 */

import { ReleaseService } from "@whatsnew/core";
import type { WNFAggregatedDocument, WNFDocument } from "@whatsnew/types";
import { type ParsedArgs, parseArgs, parseTarget } from "./args.js";
import { type FormatType, format } from "./formatters/index.js";
import { parseRange, type RangeQuery } from "./range-parser.js";
import { colors } from "./utils/colors.js";
import { CLIError } from "./utils/errors.js";

const VERSION = "0.1.0";

const HELP_TEXT = `
${colors.bold("whatsnew")} - See what changed in your dependencies

${colors.bold("USAGE")}
  whatsnew <repo>                    Show latest release
  whatsnew <repo>@<version>          Show specific version
  whatsnew <repo> --since <value>    Show changes since version or date

${colors.bold("ARGUMENTS")}
  <repo>                             GitHub repo (owner/repo format)

${colors.bold("RANGE OPTIONS")} ${colors.dim("(auto-detects date vs version)")}
  --since, --from <value>            Starting point (e.g., v3.0.0 or 2024-06)
  --until, --to <value>              Ending point (default: latest/today)

${colors.bold("OTHER OPTIONS")}
  --package, -p <name>               Filter monorepo by package name
  --format, -f <type>                Output format: text, json, markdown
  --help, -h                         Show this help message
  --version, -v                      Show version

${colors.bold("EXAMPLES")}
  ${colors.dim("# Latest release")}
  whatsnew vercel/ai

  ${colors.dim("# Specific version")}
  whatsnew vercel/ai@v4.0.0

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

${colors.bold("ENVIRONMENT")}
  GITHUB_TOKEN                       GitHub API token for higher rate limits
  NO_COLOR                           Disable colored output
`;

export async function run(argv: string[]): Promise<void> {
	const args = parseArgs(argv);

	if (args.help) {
		console.log(HELP_TEXT);
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
	const { repo, version: inlineVersion } = parseTarget(target);

	// Validate repo format
	if (!repo.includes("/")) {
		throw new CLIError(
			`Invalid repository format: ${repo}`,
			"Use owner/repo format, e.g., vercel/ai",
		);
	}

	const [owner, repoName] = repo.split("/");

	// Initialize service
	const service = new ReleaseService({
		token: process.env.GITHUB_TOKEN,
		enableFallback: true,
	});

	let result: WNFDocument | WNFAggregatedDocument;

	// Determine what to fetch
	if (inlineVersion) {
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
		// Latest release
		result = await service.getLatestReleaseWNF(owner, repoName, args.package);
	}

	// Format and output
	const output = format(result, args.format as FormatType);
	console.log(output);
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
