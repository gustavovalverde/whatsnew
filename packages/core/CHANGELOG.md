# @whatsnew/core

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

- Updated dependencies [8373fe3]
- Updated dependencies [8373fe3]
  - @whatsnew/utils@0.2.0
  - @whatsnew/types@0.4.0
  - @whatsnew/parsers@0.4.0

## 0.3.2

### Patch Changes

- 4fe0f52: Fix scope and refs duplication in formatted output

  Extractors were embedding structured data (scope, refs) in the text field,
  causing output like: `[ www] ** www**: minor updates (#5749) (5749)`

  - Add `stripTrailingRefs()` utility to clean text fields
  - Fix all extractors to properly separate text from metadata
  - Trim scope whitespace (e.g., `feat( www):` → scope: `www`)

- Updated dependencies [daacbad]
- Updated dependencies [4fe0f52]
  - @whatsnew/parsers@0.3.2
  - @whatsnew/utils@0.1.5

## 0.3.1

### Patch Changes

- a2e17b3: Improve categorization accuracy and output consistency

  - Fix items containing "fixes" as a noun being incorrectly categorized as "other" (e.g., "Bring React Server Component fixes to Server Actions")
  - Filter out "Version X.Y.Z" noise entries from commit messages
  - Sort merged categories by priority order for consistent output (features before fixes, etc.)

- Updated dependencies [a2e17b3]
  - @whatsnew/parsers@0.3.1
  - @whatsnew/utils@0.1.4

## 0.3.0

### Patch Changes

- Updated dependencies [4431853]
  - @whatsnew/types@0.3.0
  - @whatsnew/parsers@0.3.0

## 0.1.2

### Patch Changes

- 42c5668: fix: resolve workspace:\* protocol during npm publish

  Use bun publish directly instead of changeset publish to properly resolve
  workspace:\* references to actual version numbers before publishing to npm.

- Updated dependencies [42c5668]
  - @whatsnew/parsers@0.1.2
  - @whatsnew/types@0.1.2

## 0.1.1

### Patch Changes

- efd6ce2: fix(cli): use node shebang for npx compatibility

  - Changed shebang from `#!/usr/bin/env bun` to `#!/usr/bin/env node`
  - CLI now works with `npx @whatsnew/cli` without requiring Bun
  - Updated repository URLs to correct GitHub repo

- Updated dependencies [efd6ce2]
  - @whatsnew/parsers@0.1.1
  - @whatsnew/types@0.1.1
