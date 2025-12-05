/**
 * Output formatters
 */

export { formatJson } from "./json.js";
export { formatMarkdown } from "./markdown.js";
export { formatText } from "./text.js";

import type { WNFAggregatedDocument, WNFDocument } from "@whatsnew/types";
import { formatJson } from "./json.js";
import { formatMarkdown } from "./markdown.js";
import { formatText } from "./text.js";

export type FormatType = "text" | "json" | "markdown";

export function format(
	doc: WNFDocument | WNFAggregatedDocument,
	type: FormatType,
): string {
	switch (type) {
		case "json":
			return formatJson(doc);
		case "markdown":
			return formatMarkdown(doc);
		default:
			return formatText(doc);
	}
}
