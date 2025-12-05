# E2E Validation Analysis

Last run: 2025-12-05

## Summary

- **Total Repositories**: 25
- **GitHub Successful**: 23/23
- **GitLab**: Not yet implemented (2 repos)
- **Average Confidence**: 80.9%
- **Average Items per Release**: 60.5

## Results by Quality

### Excellent (>50 items)
| Repository | Items | Categories | Confidence |
|------------|-------|------------|------------|
| drizzle-team/drizzle-orm | 221 | 8 | 75% |
| oven-sh/bun | 212 | 9 | 75% |
| angular/angular | 208 | 7 | 75% |
| langchain-ai/langchainjs | 184 | 7 | 90% |
| vitejs/vite | 178 | 8 | 75% |
| colinhacks/zod | 86 | 8 | 75% |
| vercel/next.js | 77 | 8 | 75% |
| vercel/turborepo | 52 | 9 | 90% |

### Good (10-50 items)
| Repository | Items | Categories | Confidence |
|------------|-------|------------|------------|
| vuejs/core | 44 | 5 | 75% |
| fastify/fastify | 40 | 5 | 90% |
| hashicorp/terraform | 23 | 4 | 75% |
| evanw/esbuild | 11 | 3 | 75% |

### Moderate (1-10 items)
| Repository | Items | Categories | Confidence |
|------------|-------|------------|------------|
| denoland/deno | 8 | 3 | 75% |
| anthropics/anthropic-sdk-python | 7 | 4 | 75% |
| openai/openai-node | 7 | 5 | 75% |
| prisma/prisma | 7 | 4 | 80% |
| trpc/trpc | 7 | 4 | 90% |
| sveltejs/svelte | 5 | 3 | 90% |
| honojs/hono | 5 | 3 | 90% |
| facebook/react | 4 | 2 | 70% |
| expressjs/express | 3 | 2 | 90% |
| vercel/ai | 2 | 2 | 90% |

### Zero Items (Sparse Release)
| Repository | Reason | Confidence |
|------------|--------|------------|
| TanStack/query | Patch release with only internal changes | 90% |

## Key Findings

### What's Working Well

1. **Multi-source fallback**: Enabled by default, dramatically improves results
   - vuejs/core: 0 → 44 items (commits augmentation)
   - vitejs/vite: 0 → 178 items (commits augmentation)
   - angular/angular: 0 → 208 items (commits augmentation)

2. **Changesets format**: Excellent parsing including dependency updates
   - langchain-ai/langchainjs: 0 → 184 items (deps + commits)
   - drizzle-team/drizzle-orm: 5 → 221 items (deps + commits)

3. **Commit history augmentation**: Catches undocumented changes
   - bun: 19 → 212 items
   - next.js: 0 → 77 items

4. **Category distribution**: Successfully splits into 7-9 categories per repo

### Remaining Gaps

1. **TanStack/query**: Returns 0 items - very sparse patch release
   - The release body only has "Patch Changes" header with no content
   - Commit history doesn't have tagged commits for this release

2. **GitLab support**: Not yet implemented (2 repos)

## Improvements Made

| Fix | Impact |
|-----|--------|
| Changesets dependency extraction | Inline deps now extracted as items |
| Fallback enabled by default | Repos referencing CHANGELOG.md now work |
| Smart AI defaults | Auto-enables when API key present |
| Commits augmentation | Catches undocumented changes |

## Test Command Reference

```bash
# Run all tests
bun run scripts/e2e/validate.ts

# Run specific category
bun run scripts/e2e/validate.ts --category "AI/ML"

# Run single repo
bun run scripts/e2e/validate.ts --repo vercel/ai

# Verbose mode
bun run scripts/e2e/validate.ts --verbose --limit 5
```
