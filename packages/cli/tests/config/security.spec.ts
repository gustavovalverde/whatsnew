import { describe, expect, it } from "vitest";
import {
	detectProviderFromKey,
	isValidAnthropicKeyFormat,
	isValidGitHubTokenFormat,
	isValidOpenAIKeyFormat,
	maskToken,
} from "../../src/config/security.js";

describe("security utilities", () => {
	describe("maskToken", () => {
		it("returns '(not set)' for undefined", () => {
			expect(maskToken(undefined)).toBe("(not set)");
		});

		it("returns '(not set)' for empty string", () => {
			expect(maskToken("")).toBe("(not set)");
		});

		it("returns '****' for tokens <= 8 chars", () => {
			expect(maskToken("short")).toBe("****");
			expect(maskToken("12345678")).toBe("****");
		});

		it("masks middle of longer tokens", () => {
			expect(maskToken("ghp_xxxxxxxxxxxx")).toBe("ghp_****xxxx");
			expect(maskToken("sk-ant-api-key-here")).toBe("sk-a****here");
		});
	});

	describe("isValidGitHubTokenFormat", () => {
		it("accepts classic PAT (ghp_)", () => {
			expect(isValidGitHubTokenFormat("ghp_xxxxxxxxxxxx")).toBe(true);
		});

		it("accepts fine-grained PAT (github_pat_)", () => {
			expect(isValidGitHubTokenFormat("github_pat_xxxxxxxxxxxx")).toBe(true);
		});

		it("accepts OAuth token (gho_)", () => {
			expect(isValidGitHubTokenFormat("gho_xxxxxxxxxxxx")).toBe(true);
		});

		it("accepts user-to-server token (ghu_)", () => {
			expect(isValidGitHubTokenFormat("ghu_xxxxxxxxxxxx")).toBe(true);
		});

		it("accepts server-to-server token (ghs_)", () => {
			expect(isValidGitHubTokenFormat("ghs_xxxxxxxxxxxx")).toBe(true);
		});

		it("accepts refresh token (ghr_)", () => {
			expect(isValidGitHubTokenFormat("ghr_xxxxxxxxxxxx")).toBe(true);
		});

		it("rejects invalid prefixes", () => {
			expect(isValidGitHubTokenFormat("invalid_token")).toBe(false);
			expect(isValidGitHubTokenFormat("sk-ant-xxx")).toBe(false);
			expect(isValidGitHubTokenFormat("")).toBe(false);
		});
	});

	describe("isValidAnthropicKeyFormat", () => {
		it("accepts keys starting with sk-ant-", () => {
			expect(isValidAnthropicKeyFormat("sk-ant-api03-xxxx")).toBe(true);
		});

		it("rejects invalid formats", () => {
			expect(isValidAnthropicKeyFormat("sk-xxxx")).toBe(false);
			expect(isValidAnthropicKeyFormat("ghp_xxxx")).toBe(false);
			expect(isValidAnthropicKeyFormat("")).toBe(false);
		});
	});

	describe("isValidOpenAIKeyFormat", () => {
		it("accepts keys starting with sk-", () => {
			expect(isValidOpenAIKeyFormat("sk-xxxxxxxxxxxx")).toBe(true);
			expect(isValidOpenAIKeyFormat("sk-proj-xxxx")).toBe(true);
		});

		it("rejects invalid formats", () => {
			expect(isValidOpenAIKeyFormat("ghp_xxxx")).toBe(false);
			expect(isValidOpenAIKeyFormat("")).toBe(false);
		});
	});

	describe("detectProviderFromKey", () => {
		it("detects Anthropic keys", () => {
			expect(detectProviderFromKey("sk-ant-api03-xxxx")).toBe("anthropic");
		});

		it("detects OpenAI keys", () => {
			expect(detectProviderFromKey("sk-xxxxxxxxxxxx")).toBe("openai");
		});

		it("returns null for unknown formats", () => {
			expect(detectProviderFromKey("ghp_xxxx")).toBe(null);
			expect(detectProviderFromKey("unknown")).toBe(null);
		});

		it("prefers Anthropic for sk-ant- prefix", () => {
			// sk-ant- should be detected as Anthropic, not OpenAI
			expect(detectProviderFromKey("sk-ant-xxxx")).toBe("anthropic");
		});
	});
});
