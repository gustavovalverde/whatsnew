# @whatsnew/parsers

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
