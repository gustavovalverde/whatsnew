# @whatsnew/cli

## 0.1.1

### Patch Changes

- efd6ce2: fix(cli): use node shebang for npx compatibility

  - Changed shebang from `#!/usr/bin/env bun` to `#!/usr/bin/env node`
  - CLI now works with `npx @whatsnew/cli` without requiring Bun
  - Updated repository URLs to correct GitHub repo

- Updated dependencies [efd6ce2]
  - @whatsnew/core@0.1.1
  - @whatsnew/types@0.1.1
