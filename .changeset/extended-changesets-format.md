---
"@whatsnew/parsers": patch
---

Support extended changesets format used by shadcn-ui and similar projects

The extractor now handles changesets with PR links, commit URLs, and "Thanks" messages:
```
-   [#PR](url) [`commit`](url) Thanks [@author](url)! - message
```
