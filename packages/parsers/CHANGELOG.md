# @whatsnew/parsers

## 0.3.2

### Patch Changes

- daacbad: Support extended changesets format used by shadcn-ui and similar projects

  The extractor now handles changesets with PR links, commit URLs, and "Thanks" messages:

  ```
  -   [#PR](url) [`commit`](url) Thanks [@author](url)! - message
  ```

- 4fe0f52: Fix scope and refs duplication in formatted output

  Extractors were embedding structured data (scope, refs) in the text field,
  causing output like: `[ www] ** www**: minor updates (#5749) (5749)`

  - Add `stripTrailingRefs()` utility to clean text fields
  - Fix all extractors to properly separate text from metadata
  - Trim scope whitespace (e.g., `feat( www):` → scope: `www`)

- Updated dependencies [4fe0f52]
  - @whatsnew/utils@0.1.5

## 0.3.1

### Patch Changes

- a2e17b3: Improve categorization accuracy and output consistency

  - Fix items containing "fixes" as a noun being incorrectly categorized as "other" (e.g., "Bring React Server Component fixes to Server Actions")
  - Filter out "Version X.Y.Z" noise entries from commit messages
  - Sort merged categories by priority order for consistent output (features before fixes, etc.)

- Updated dependencies [a2e17b3]
  - @whatsnew/utils@0.1.4

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

## 0.1.2

### Patch Changes

- 42c5668: fix: resolve workspace:\* protocol during npm publish

  Use bun publish directly instead of changeset publish to properly resolve
  workspace:\* references to actual version numbers before publishing to npm.

- Updated dependencies [42c5668]
  - @whatsnew/types@0.1.2

## 0.1.1

### Patch Changes

- efd6ce2: fix(cli): use node shebang for npx compatibility

  - Changed shebang from `#!/usr/bin/env bun` to `#!/usr/bin/env node`
  - CLI now works with `npx @whatsnew/cli` without requiring Bun
  - Updated repository URLs to correct GitHub repo

- Updated dependencies [efd6ce2]
  - @whatsnew/types@0.1.1
