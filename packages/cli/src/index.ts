/**
 * CLI entry point
 */

import { run } from "./cli.js";
import { formatError } from "./utils/errors.js";

export async function main(argv: string[]): Promise<void> {
	try {
		await run(argv);
	} catch (error) {
		console.error(formatError(error));
		process.exit(1);
	}
}

export { parseArgs, parseTarget } from "./args.js";
// Re-export for testing
export { run } from "./cli.js";
export { format } from "./formatters/index.js";
export { isDateLike, parseRange } from "./range-parser.js";
