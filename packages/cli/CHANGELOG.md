# @whatsnew/cli

## 0.3.1

### Patch Changes

- Updated dependencies [a2e17b3]
  - @whatsnew/core@0.3.1

## 0.3.0

### Minor Changes

- 4431853: Add category filtering with --important flag

  **New Features:**

  - `--important` / `-i` flag to show only important changes (breaking, security, features, fixes, perf)
  - `--filter <type>` option for fine-grained control (important, maintenance, all)
  - Breaking items from any category surface when using --important filter
  - API support via `?filter=important` query parameter

  **Schema Additions:**

  - `CategoryMeta` interface with importance and priority metadata
  - `CATEGORY_METADATA` constant for downstream client filtering
  - `CategoryFilter` type for filter options

  **Filter Module (`@whatsnew/parsers`):**

  - `filterCategories(categories, filter)` - Apply category filtering
  - `isImportantCategory(id)` / `isMaintenanceCategory(id)` - Category helpers
  - `IMPORTANT_CATEGORIES` / `MAINTENANCE_CATEGORIES` - Category arrays

  **Usage:**

  ```bash
  # Show only important changes
  whatsnew vercel/ai --important
  whatsnew vercel/ai -i

  # Show only maintenance changes
  whatsnew vercel/ai --filter maintenance
  ```

### Patch Changes

- Updated dependencies [4431853]
  - @whatsnew/types@0.3.0
  - @whatsnew/core@0.3.0

## 0.2.0

### Minor Changes

- c50eae8: Add global configuration management for persistent settings

  **New Features:**

  - `whatsnew config set <key> <value>` - Save settings to config file
  - `whatsnew config list` - View current configuration with source labels
  - `whatsnew config path` - Show config file location
  - `whatsnew config unset <key>` - Remove a setting

  **Configuration Priority:**

  1. CLI flags (`--github-token`, `--ai-key`)
  2. Environment variables (`GITHUB_TOKEN`, `ANTHROPIC_API_KEY`, etc.)
  3. Config file (`~/.config/whatsnew/config.json`)

  **Security:**

  - XDG-compliant config directory
  - Secure file permissions (0600 for files, 0700 for directories)
  - Token validation on set with `--skip-validation` escape hatch
  - Tokens are masked in `config list` output

  **Supported Keys:**

  - `github_token` - GitHub personal access token
  - `ai.api_key` - AI provider API key (auto-detects Anthropic/OpenAI)
  - `ai.provider` - AI provider selection (anthropic or openai)

## 0.1.2

### Patch Changes

- 42c5668: fix: resolve workspace:\* protocol during npm publish

  Use bun publish directly instead of changeset publish to properly resolve
  workspace:\* references to actual version numbers before publishing to npm.

- Updated dependencies [42c5668]
  - @whatsnew/core@0.1.2
  - @whatsnew/types@0.1.2

## 0.1.1

### Patch Changes

- efd6ce2: fix(cli): use node shebang for npx compatibility

  - Changed shebang from `#!/usr/bin/env bun` to `#!/usr/bin/env node`
  - CLI now works with `npx @whatsnew/cli` without requiring Bun
  - Updated repository URLs to correct GitHub repo

- Updated dependencies [efd6ce2]
  - @whatsnew/core@0.1.1
  - @whatsnew/types@0.1.1
