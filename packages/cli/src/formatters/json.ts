/**
 * JSON formatter - outputs raw WNF document
 */

import type { WNFAggregatedDocument, WNFDocument } from "@whatsnew/types";

export function formatJson(doc: WNFDocument | WNFAggregatedDocument): string {
	return JSON.stringify(doc, null, 2);
}
