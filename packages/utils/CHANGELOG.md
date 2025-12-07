# @whatsnew/utils

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
