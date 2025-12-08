# @whatsnew/utils

## 0.2.0

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

## 0.1.5

### Patch Changes

- 4fe0f52: Fix scope and refs duplication in formatted output

  Extractors were embedding structured data (scope, refs) in the text field,
  causing output like: `[ www] ** www**: minor updates (#5749) (5749)`

  - Add `stripTrailingRefs()` utility to clean text fields
  - Fix all extractors to properly separate text from metadata
  - Trim scope whitespace (e.g., `feat( www):` → scope: `www`)

## 0.1.4

### Patch Changes

- a2e17b3: Improve categorization accuracy and output consistency

  - Fix items containing "fixes" as a noun being incorrectly categorized as "other" (e.g., "Bring React Server Component fixes to Server Actions")
  - Filter out "Version X.Y.Z" noise entries from commit messages
  - Sort merged categories by priority order for consistent output (features before fixes, etc.)
