---
"@whatsnew/types": minor
"@whatsnew/parsers": minor
"@whatsnew/cli": minor
---

Add category filtering with --important flag

**New Features:**
- `--important` / `-i` flag to show only important changes (breaking, security, features, fixes, perf)
- `--filter <type>` option for fine-grained control (important, maintenance, all)
- Breaking items from any category surface when using --important filter
- API support via `?filter=important` query parameter

**Schema Additions:**
- `CategoryMeta` interface with importance and priority metadata
- `CATEGORY_METADATA` constant for downstream client filtering
- `CategoryFilter` type for filter options

**Filter Module (`@whatsnew/parsers`):**
- `filterCategories(categories, filter)` - Apply category filtering
- `isImportantCategory(id)` / `isMaintenanceCategory(id)` - Category helpers
- `IMPORTANT_CATEGORIES` / `MAINTENANCE_CATEGORIES` - Category arrays

**Usage:**
```bash
# Show only important changes
whatsnew vercel/ai --important
whatsnew vercel/ai -i

# Show only maintenance changes
whatsnew vercel/ai --filter maintenance
```
