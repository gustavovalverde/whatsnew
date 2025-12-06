---
"@whatsnew/cli": patch
"@whatsnew/core": patch
"@whatsnew/parsers": patch
"@whatsnew/types": patch
---

fix: resolve workspace:* protocol during npm publish

Use bun publish directly instead of changeset publish to properly resolve
workspace:* references to actual version numbers before publishing to npm.
