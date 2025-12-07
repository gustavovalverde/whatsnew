import type { GitHubCommit } from "@whatsnew/types";
import { describe, expect, it } from "vitest";
import { extractItemsFromCommits } from "../../src/sources/commit-history.source.js";

/**
 * Helper to create a mock commit
 */
function createCommit(message: string): GitHubCommit {
	return {
		sha: "abc123",
		commit: {
			message,
			author: { name: "Test", email: "test@example.com", date: "2024-01-01" },
		},
		html_url: "https://github.com/test/repo/commit/abc123",
		author: { login: "testuser", avatar_url: "", html_url: "" },
	};
}

describe("extractItemsFromCommits", () => {
	describe("scope extraction and trimming", () => {
		it("extracts scope from conventional commit", () => {
			const commits = [createCommit("feat(api): add new endpoint")];
			const items = extractItemsFromCommits(commits);

			expect(items[0].scope).toBe("api");
			expect(items[0].text).toBe("add new endpoint");
		});

		it("trims leading space from scope", () => {
			// This was the original bug: feat( www): produced scope " www"
			const commits = [createCommit("feat( www): minor updates")];
			const items = extractItemsFromCommits(commits);

			expect(items[0].scope).toBe("www");
			expect(items[0].scope).not.toBe(" www");
		});

		it("trims trailing space from scope", () => {
			const commits = [createCommit("fix(core ): bug fix")];
			const items = extractItemsFromCommits(commits);

			expect(items[0].scope).toBe("core");
		});

		it("trims both leading and trailing spaces from scope", () => {
			const commits = [createCommit("feat( utils ): add helper")];
			const items = extractItemsFromCommits(commits);

			expect(items[0].scope).toBe("utils");
		});
	});

	describe("text normalization - no scope embedding", () => {
		it("does not embed scope in text", () => {
			// Previously, text was set to "**${scope}**: ${subject}"
			// Now text should just be the subject
			const commits = [createCommit("feat(www): add feature")];
			const items = extractItemsFromCommits(commits);

			expect(items[0].text).toBe("add feature");
			expect(items[0].text).not.toContain("www");
			expect(items[0].text).not.toContain("**");
		});

		it("scope is only in scope field, not in text", () => {
			const commits = [createCommit("fix(auth): resolve login issue")];
			const items = extractItemsFromCommits(commits);

			expect(items[0].scope).toBe("auth");
			expect(items[0].text).toBe("resolve login issue");
			// Ensure no duplication
			expect(items[0].text).not.toMatch(/auth/i);
		});
	});

	describe("refs extraction and stripping", () => {
		it("extracts refs from commit message", () => {
			const commits = [createCommit("fix(api): resolve bug (#123)")];
			const items = extractItemsFromCommits(commits);

			expect(items[0].refs).toContain("123");
		});

		it("strips trailing refs from text", () => {
			const commits = [createCommit("fix: resolve issue (#456)")];
			const items = extractItemsFromCommits(commits);

			expect(items[0].text).toBe("resolve issue");
			expect(items[0].text).not.toContain("#456");
			expect(items[0].text).not.toContain("456");
		});

		it("refs are in refs field, not duplicated in text", () => {
			const commits = [createCommit("feat(core): new feature (#789)")];
			const items = extractItemsFromCommits(commits);

			expect(items[0].refs).toContain("789");
			expect(items[0].text).toBe("new feature");
		});
	});

	describe("no duplication - integration", () => {
		it("produces clean output without duplication", () => {
			// Simulates the original bug: feat( www): minor updates (#5749)
			// Should NOT produce: [ www] ** www**: minor updates (#5749) (5749)
			const commits = [createCommit("feat( www): minor updates (#5749)")];
			const items = extractItemsFromCommits(commits);

			const item = items[0];

			// Scope should be trimmed and only in scope field
			expect(item.scope).toBe("www");

			// Text should be clean - no scope, no refs
			expect(item.text).toBe("minor updates");

			// Refs should be in refs field
			expect(item.refs).toContain("5749");

			// Verify no duplication patterns
			expect(item.text).not.toContain("www");
			expect(item.text).not.toContain("5749");
			expect(item.text).not.toContain("**");
		});
	});

	describe("non-conventional commits", () => {
		it("strips trailing refs from non-conventional commits", () => {
			// Commit missing colon after scope - not a valid conventional commit
			const commits = [
				createCommit("fix(shadcn) arrays and nested spread (#5711)"),
			];
			const items = extractItemsFromCommits(commits);

			const item = items[0];

			// Should strip trailing ref
			expect(item.text).toBe("fix(shadcn) arrays and nested spread");
			expect(item.text).not.toContain("#5711");

			// Refs should be extracted
			expect(item.refs).toContain("5711");
		});

		it("handles regular commit messages with refs", () => {
			const commits = [createCommit("Update documentation (#123)")];
			const items = extractItemsFromCommits(commits);

			const item = items[0];

			expect(item.text).toBe("Update documentation");
			expect(item.refs).toContain("123");
		});
	});
});
