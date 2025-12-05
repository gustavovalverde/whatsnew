import { z } from "zod";

/**
 * Zod schema for AI extraction output
 * Used with Vercel AI SDK's generateObject for type-safe structured output
 *
 * Key design decisions:
 * - sourceQuote: Enables grounded generation by requiring AI to cite source text
 * - refs: Numbers only (no #), validated against pre-extracted anchors
 * - nullable() over optional() for better AI compliance
 */
export const WNFExtractionSchema = z.object({
	categories: z.array(
		z.object({
			id: z
				.enum([
					"breaking",
					"features",
					"fixes",
					"security",
					"perf",
					"deps",
					"docs",
					"refactor",
					"chore",
					"other",
				])
				.describe("Category ID for this group of changes"),
			title: z.string().describe("Human-readable category title"),
			items: z.array(
				z.object({
					text: z.string().describe("Clean, concise description of the change"),
					sourceQuote: z
						.string()
						.nullable()
						.describe(
							"Exact quote from raw content that this item summarizes. Include the relevant snippet for grounding. Use null only if no specific source text exists.",
						),
					refs: z
						.array(z.string())
						.describe(
							"PR/issue numbers from AVAILABLE_ANCHORS that relate to this change. Use numbers only without # symbol.",
						),
					breaking: z
						.boolean()
						.nullable()
						.describe("True if this is a breaking change"),
				}),
			),
		}),
	),
	version: z.string().nullable().describe("Version number if mentioned"),
	hasBreakingChanges: z
		.boolean()
		.describe("True if any breaking changes were identified"),
	notes: z
		.array(
			z.object({
				type: z.enum(["migration", "deprecation", "upgrade", "info"]),
				text: z.string(),
			}),
		)
		.nullable()
		.describe("Important notes like migration guides or deprecation warnings"),
});

export type WNFExtraction = z.infer<typeof WNFExtractionSchema>;
