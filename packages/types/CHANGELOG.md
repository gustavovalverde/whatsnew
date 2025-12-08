# @whatsnew/types

## 0.4.0

### Minor Changes

- 8373fe3: Add mathematical composite confidence scoring

  - Add `calculateCompositeScore()` function with weighted quality dimensions
  - Add `QualityDimensions` interface for structured quality assessment
  - Add `terseRatio` tracking for short/ambiguous changelog entries
  - Update confidence breakdown to include composite scoring in output

### Patch Changes

- 8373fe3: Fix section-based categorization and tag preservation

  **Categorization improvements:**

  - Add section_hint tier that takes precedence over keyword matching
  - Fix items in "Documentation" sections being miscategorized as "fixes"
  - Enhanced `stripTrailingRefs()` to remove inline markdown ref links

  **Tag and URL fixes:**

  - Preserve original tag from GitHub API (e.g., `v3.1.0` instead of `3.1.0`)
  - Use GitHub's actual release URL instead of constructing it
  - Fixes display and link issues for repos with non-standard tag formats

  Tested against 47ng/nuqs and zcashfoundation/zebra.

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

## 0.1.2

### Patch Changes

- 42c5668: fix: resolve workspace:\* protocol during npm publish

  Use bun publish directly instead of changeset publish to properly resolve
  workspace:\* references to actual version numbers before publishing to npm.

## 0.1.1

### Patch Changes

- efd6ce2: fix(cli): use node shebang for npx compatibility

  - Changed shebang from `#!/usr/bin/env bun` to `#!/usr/bin/env node`
  - CLI now works with `npx @whatsnew/cli` without requiring Bun
  - Updated repository URLs to correct GitHub repo
