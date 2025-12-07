---
"@whatsnew/parsers": patch
"@whatsnew/core": patch
"@whatsnew/utils": patch
---

Improve categorization accuracy and output consistency

- Fix items containing "fixes" as a noun being incorrectly categorized as "other" (e.g., "Bring React Server Component fixes to Server Actions")
- Filter out "Version X.Y.Z" noise entries from commit messages
- Sort merged categories by priority order for consistent output (features before fixes, etc.)
