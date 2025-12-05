/**
 * Format types supported by the parser system
 */
export type ChangelogFormat =
	| "changesets"
	| "keep-a-changelog"
	| "conventional-commits"
	| "github-auto"
	| "gitlab-official"
	| "generic";

/**
 * FormatDetector identifies the changelog format used in release notes
 *
 * This service applies pattern matching to determine which parser should
 * be used to extract structured information from release body text.
 *
 * @example
 * ```typescript
 * const detector = new FormatDetector();
 * const format = detector.detectFormat(releaseBody);
 * // Returns: 'changesets' | 'keep-a-changelog' | 'conventional-commits' | 'generic'
 * ```
 */
export class FormatDetector {
	/**
	 * Detects the changelog format of the provided release body
	 *
	 * Checks formats in order of specificity:
	 * 1. Changesets (### Major Changes, ### Minor Changes, ### Patch Changes)
	 * 2. GitHub Auto-Generated (## What's Changed, * Title by @author in URL)
	 * 3. GitLab Official (<details>/<summary> with links, tier headers)
	 * 4. Keep a Changelog (## [version] OR ### Added, ### Changed, etc.)
	 * 5. Conventional Commits (feat:, fix:, etc.)
	 * 6. Generic (fallback)
	 *
	 * @param body - The release body text to analyze
	 * @returns The detected format type
	 */
	detectFormat(body: string): ChangelogFormat {
		if (this.isChangesetsFormat(body)) {
			return "changesets";
		}

		if (this.isGitHubAutoFormat(body)) {
			return "github-auto";
		}

		if (this.isGitLabOfficialFormat(body)) {
			return "gitlab-official";
		}

		if (this.isKeepAChangelogFormat(body)) {
			return "keep-a-changelog";
		}

		if (this.isConventionalCommitsFormat(body)) {
			return "conventional-commits";
		}

		return "generic";
	}

	/**
	 * Checks if the body uses Changesets format
	 *
	 * Changesets format is commonly used in monorepos and includes sections like:
	 * - ### Major Changes
	 * - ### Minor Changes
	 * - ### Patch Changes
	 *
	 * @param body - The release body text
	 * @returns True if Changesets format is detected
	 */
	private isChangesetsFormat(body: string): boolean {
		return (
			body.includes("### Major Changes") ||
			body.includes("### Minor Changes") ||
			body.includes("### Patch Changes")
		);
	}

	/**
	 * Checks if the body uses GitHub auto-generated release notes format
	 *
	 * GitHub auto-generated format is created by GitHub's release notes generator
	 * and includes:
	 * - ## What's Changed (main header)
	 * - * Title by @author in https://github.com/.../pull/123 (PR entries)
	 * - ## New Contributors (optional section)
	 * - **Full Changelog:** URL (optional comparison link)
	 *
	 * @see https://docs.github.com/en/repositories/releasing-projects-on-github/automatically-generated-release-notes
	 * @param body - The release body text
	 * @returns True if GitHub auto-generated format is detected
	 */
	private isGitHubAutoFormat(body: string): boolean {
		// Check for "What's Changed" header (case-insensitive)
		const hasWhatsChanged = /##\s*What'?s Changed/i.test(body);

		// Check for PR entry format: * Title by @author in https://github.com/.../pull/123
		const hasPREntry =
			/^\*\s+.+\s+by\s+@[\w-]+\s+in\s+https:\/\/github\.com\/.+\/pull\/\d+/m.test(
				body,
			);

		// Check for Full Changelog link
		const hasFullChangelog = /\*\*Full Changelog:\*\*/.test(body);

		// Check for New Contributors section
		const hasNewContributors = /##\s*New Contributors/i.test(body);

		// Detect if any strong GitHub auto-generated indicators are present
		return (
			hasWhatsChanged ||
			(hasPREntry && (hasFullChangelog || hasNewContributors))
		);
	}

	/**
	 * Checks if the body uses GitLab Official release format
	 *
	 * GitLab Official format is used by gitlab-org/gitlab and includes:
	 * - <details><summary>[Feature Title](url)</summary> collapsible sections
	 * - <code> tags for feature labels within summaries
	 * - #### [Tier] headers (Ultimate, Premium, Free)
	 * - ##### [Category](url) headers for stages
	 *
	 * @see https://gitlab.com/gitlab-org/gitlab/-/releases
	 * @param body - The release body text
	 * @returns True if GitLab Official format is detected
	 */
	private isGitLabOfficialFormat(body: string): boolean {
		// Strong signal: <details><summary> with markdown link inside
		const hasDetailsWithLink = /<details>\s*<summary>\s*\[/.test(body);

		// Strong signal: <code> tags inside <summary> (feature labels)
		const hasCodeInSummary = /<summary>[^<]*<code>/.test(body);

		// Medium signal: Tier headers like #### [Ultimate] or #### [Premium]
		const hasTierHeaders = /^####\s*\[(Ultimate|Premium|Free|Core)\]/im.test(
			body,
		);

		// Medium signal: Category headers at h5 level with links
		const hasCategoryHeaders = /^#####\s*\[[^\]]+\]\([^)]+\)/m.test(body);

		// Require strong signal plus at least one supporting signal
		if (hasDetailsWithLink) {
			return hasCodeInSummary || hasTierHeaders || hasCategoryHeaders;
		}

		// Or multiple medium signals together
		return hasTierHeaders && hasCategoryHeaders;
	}

	/**
	 * Checks if the body uses Keep a Changelog format
	 *
	 * Keep a Changelog format follows the standard defined at keepachangelog.com
	 * and includes sections like:
	 * - ## [version] - date (version header)
	 * - ### Added, ### Changed, ### Deprecated, ### Removed, ### Fixed, ### Security
	 *
	 * Detection accepts EITHER:
	 * - Version header (## [version]), OR
	 * - Standard section headers (### Added, ### Fixed, etc.)
	 *
	 * This is because GitHub releases often omit the version header but still
	 * follow the Keep a Changelog section format.
	 *
	 * @see https://keepachangelog.com/en/1.1.0/
	 * @param body - The release body text
	 * @returns True if Keep a Changelog format is detected
	 */
	private isKeepAChangelogFormat(body: string): boolean {
		// Check for version header: ## [1.0.0] or ## [Unreleased]
		const hasVersionHeader = /##\s*\[[\w\d.-]+\]/.test(body);

		// Check for standard Keep a Changelog section headers
		const hasStandardSections =
			body.includes("### Added") ||
			body.includes("### Changed") ||
			body.includes("### Deprecated") ||
			body.includes("### Removed") ||
			body.includes("### Fixed") ||
			body.includes("### Security");

		// Accept EITHER version header OR standard section headers
		return hasVersionHeader || hasStandardSections;
	}

	/**
	 * Checks if the body uses Conventional Commits format
	 *
	 * Conventional Commits format uses commit message conventions like:
	 * - feat(scope): message
	 * - fix: message
	 * - docs(scope): message
	 * - build!: breaking build change
	 *
	 * @see https://www.conventionalcommits.org/en/v1.0.0/
	 * @param body - The release body text
	 * @returns True if Conventional Commits format is detected
	 */
	private isConventionalCommitsFormat(body: string): boolean {
		// Include all standard types: feat, fix, docs, style, refactor, perf, test, build, ci, chore
		const ccPattern =
			/^(feat|fix|docs|style|refactor|perf|test|build|ci|chore)(\(.+\))?(!)?:/m;
		return ccPattern.test(body);
	}

	/**
	 * Calculates confidence score based on format detection
	 *
	 * Higher confidence indicates better structured release notes:
	 * - 0.9: Well-structured (Changesets, Keep a Changelog, GitHub auto-generated)
	 * - 0.85: Conventional commits format
	 * - 0.7: Basic structure (has headings)
	 * - 0.6: Default
	 * - 0.3: Minimal content (< 50 chars)
	 *
	 * @param body - The release body text
	 * @returns Confidence score between 0 and 1
	 */
	calculateConfidence(body: string): number {
		// Highest confidence for well-known structured formats
		if (
			body.includes("### Major Changes") ||
			body.includes("### Minor Changes") ||
			body.includes("### Patch Changes") ||
			/##\s*\[[\w\d.-]+\]/.test(body)
		) {
			return 0.9;
		}

		// High confidence for GitHub auto-generated format
		if (
			/##\s*What'?s Changed/i.test(body) ||
			/^\*\s+.+\s+by\s+@[\w-]+\s+in\s+https:\/\/github\.com/m.test(body)
		) {
			return 0.9;
		}

		// High confidence for GitLab Official format
		if (
			(/<details>\s*<summary>\s*\[/.test(body) &&
				/<summary>[^<]*<code>/.test(body)) ||
			(/^####\s*\[(Ultimate|Premium|Free)\]/im.test(body) &&
				/^#####\s*\[[^\]]+\]\([^)]+\)/m.test(body))
		) {
			return 0.9;
		}

		// High confidence for Keep a Changelog section headers
		if (
			body.includes("### Added") ||
			body.includes("### Changed") ||
			body.includes("### Fixed") ||
			body.includes("### Security")
		) {
			return 0.9;
		}

		// Good confidence for conventional commits format
		if (
			/^(feat|fix|docs|style|refactor|perf|test|build|ci|chore)(\(.+\))?(!)?:/m.test(
				body,
			)
		) {
			return 0.85;
		}

		// Medium confidence for basic structure
		if (body.includes("###") || body.includes("##")) {
			return 0.7;
		}

		// Low confidence for minimal content
		if (body.trim().length < 50) {
			return 0.3;
		}

		return 0.6;
	}
}
