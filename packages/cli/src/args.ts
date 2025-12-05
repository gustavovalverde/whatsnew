/**
 * CLI argument parsing
 * Uses native process.argv - no external library needed
 */

export interface ParsedArgs {
	targets: string[];
	since?: string;
	until?: string;
	package?: string;
	format: "text" | "json" | "markdown";
	help: boolean;
	version: boolean;
}

const FLAG_ALIASES: Record<string, string> = {
	"--from": "--since",
	"--to": "--until",
	"-f": "--format",
	"-h": "--help",
	"-v": "--version",
	"-p": "--package",
};

export function parseArgs(argv: string[]): ParsedArgs {
	const args: ParsedArgs = {
		targets: [],
		format: "text",
		help: false,
		version: false,
	};

	let i = 0;
	while (i < argv.length) {
		let arg = argv[i];

		// Resolve aliases
		if (FLAG_ALIASES[arg]) {
			arg = FLAG_ALIASES[arg];
		}

		if (arg === "--help" || arg === "-h") {
			args.help = true;
		} else if (arg === "--version" || arg === "-v") {
			args.version = true;
		} else if (arg === "--since" || arg === "--from") {
			i++;
			args.since = argv[i];
		} else if (arg === "--until" || arg === "--to") {
			i++;
			args.until = argv[i];
		} else if (arg === "--package" || arg === "-p") {
			i++;
			args.package = argv[i];
		} else if (arg === "--format" || arg === "-f") {
			i++;
			const format = argv[i];
			if (format === "text" || format === "json" || format === "markdown") {
				args.format = format;
			} else {
				throw new Error(
					`Invalid format: ${format}. Use 'text', 'json', or 'markdown'.`,
				);
			}
		} else if (arg.startsWith("-")) {
			throw new Error(`Unknown flag: ${arg}. Use --help for usage.`);
		} else {
			// Positional argument (target)
			args.targets.push(arg);
		}

		i++;
	}

	return args;
}

/**
 * Parse target string that may include version
 * Examples:
 *   "vercel/ai" -> { repo: "vercel/ai" }
 *   "vercel/ai@v4.0.0" -> { repo: "vercel/ai", version: "v4.0.0" }
 */
export function parseTarget(target: string): {
	repo: string;
	version?: string;
} {
	const atIndex = target.lastIndexOf("@");

	// No @ or @ is first char (scoped package without version)
	if (atIndex <= 0) {
		return { repo: target };
	}

	// Check if after @ looks like a version (starts with v or digit)
	const afterAt = target.slice(atIndex + 1);
	if (/^v?\d/.test(afterAt)) {
		return {
			repo: target.slice(0, atIndex),
			version: afterAt,
		};
	}

	// @ is part of the repo name (e.g., scoped package)
	return { repo: target };
}
