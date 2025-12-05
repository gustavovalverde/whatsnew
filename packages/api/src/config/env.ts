import { z } from "zod";

const EnvSchema = z.object({
	PORT: z.coerce.number().int().positive().default(3000),
	GITHUB_TOKEN: z.string().min(1).optional(),
	// AI Configuration
	// AI_ENABLED: When not set, AI auto-enables if an API key is present
	// Set to "true" to explicitly enable, "false" to explicitly disable
	AI_ENABLED: z
		.string()
		.optional()
		.transform((val) => {
			if (val === undefined) return undefined; // Let library auto-detect
			return val === "true";
		}),
	AI_PROVIDER: z.enum(["anthropic", "openai"]).default("anthropic"),
	AI_MODEL: z.string().optional(),
	AI_CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.6),
	// API Keys for AI providers (any one of these enables AI auto-detection)
	// - AI_GATEWAY_API_KEY: Vercel AI Gateway (preferred)
	// - ANTHROPIC_API_KEY: Direct Anthropic API
	// - OPENAI_API_KEY: Direct OpenAI API
	AI_GATEWAY_API_KEY: z.string().min(1).optional(),
	ANTHROPIC_API_KEY: z.string().min(1).optional(),
	OPENAI_API_KEY: z.string().min(1).optional(),
});

export const env = EnvSchema.parse(process.env);

export type Env = z.infer<typeof EnvSchema>;
