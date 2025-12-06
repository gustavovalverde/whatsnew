---
"@whatsnew/cli": patch
"@whatsnew/core": patch
"@whatsnew/parsers": patch
"@whatsnew/types": patch
---

fix(cli): use node shebang for npx compatibility

- Changed shebang from `#!/usr/bin/env bun` to `#!/usr/bin/env node`
- CLI now works with `npx @whatsnew/cli` without requiring Bun
- Updated repository URLs to correct GitHub repo
