---
"@whatsnew/parsers": patch
"@whatsnew/core": patch
"@whatsnew/utils": patch
---

Fix scope and refs duplication in formatted output

Extractors were embedding structured data (scope, refs) in the text field,
causing output like: `[ www] ** www**: minor updates (#5749) (5749)`

- Add `stripTrailingRefs()` utility to clean text fields
- Fix all extractors to properly separate text from metadata
- Trim scope whitespace (e.g., `feat( www):` → scope: `www`)
