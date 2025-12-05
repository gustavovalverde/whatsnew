# What's New Format (WNF) Specification

> Version 0.1

The What's New Format (WNF) is a machine-readable JSON schema that normalizes changelog data from multiple sources (GitHub releases, CHANGELOG.md files, commit history) into a single, consistent structure.

---

## Design Goals

1. **Agent-friendly** – Structured JSON with stable category IDs for AI assistants and automation
2. **Source-agnostic** – Same output format regardless of input source (releases, changelogs, commits)
3. **Traceable** – Every item links back to its original source (PR, commit, release)
4. **Quality-aware** – Confidence scoring indicates data reliability

---

## Schema

```json
{
  "spec": "wnf/0.1",
  "source": {
    "platform": "github",
    "repo": "owner/name",
    "tag": "v1.8.0",
    "commitRange": { "base": "v1.7.0", "head": "v1.8.0" }
  },
  "version": "1.8.0",
  "releasedAt": "2025-09-15T12:34:56Z",
  "summary": "New OAuth flows, faster cold start, 3 security fixes.",
  "categories": [
    {
      "id": "breaking",
      "title": "Breaking Changes",
      "items": [
        {
          "text": "Drop Node 16 support",
          "refs": ["#1234"],
          "scope": "core",
          "breaking": true,
          "score": 0.98
        }
      ]
    },
    {
      "id": "features",
      "title": "Features",
      "items": [
        {
          "text": "feat(auth): device code flow",
          "refs": ["#1290"],
          "scope": "auth"
        }
      ]
    },
    {
      "id": "fixes",
      "title": "Bug Fixes",
      "items": [
        {
          "text": "fix: resolve race in worker pool",
          "refs": ["#1281"]
        }
      ]
    },
    {
      "id": "security",
      "title": "Security",
      "items": [
        {
          "text": "CVE-2025-XXXX patched in deps",
          "refs": ["advisory/GHSA-..."]
        }
      ]
    }
  ],
  "notes": [
    {
      "type": "upgrade",
      "text": "Run new DB migration X.Y; set ENV FOO=true"
    }
  ],
  "links": {
    "release": "https://github.com/owner/name/releases/tag/v1.8.0",
    "compare": "https://github.com/owner/name/compare/v1.7.0...v1.8.0",
    "changelog": "https://github.com/owner/name/blob/main/CHANGELOG.md"
  },
  "confidence": 0.93,
  "generatedFrom": ["github.release", "changelog.md", "commits"],
  "generatedAt": "2025-09-15T14:00:00Z"
}
```

---

## Field Reference

### Root Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `spec` | string | Yes | Schema version identifier (`wnf/0.1`) |
| `source` | object | Yes | Source repository information |
| `version` | string | No | Semantic version (without `v` prefix) |
| `releasedAt` | string | No | ISO 8601 timestamp of release |
| `summary` | string | Yes | Human-readable one-line summary |
| `categories` | array | Yes | Categorized change items |
| `notes` | array | No | Migration notes, upgrade instructions |
| `links` | object | Yes | URLs to release page, comparison, changelog |
| `confidence` | number | Yes | 0-1 score indicating data quality |
| `generatedFrom` | array | Yes | Sources used to generate this document |
| `generatedAt` | string | No | ISO 8601 timestamp of generation |

### Source Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `platform` | string | Yes | `github` or `gitlab` |
| `repo` | string | Yes | `owner/name` format |
| `tag` | string | No | Git tag for this release |
| `commitRange` | object | No | Base and head commits for comparison |

### Links Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `release` | string | No | URL to release page |
| `compare` | string | No | URL to compare view |
| `changelog` | string | No | URL to changelog file |

### Category Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Stable identifier (see Category IDs below) |
| `title` | string | Yes | Human-readable header |
| `items` | array | Yes | List of change items |

### Item Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `text` | string | Yes | Change description |
| `refs` | array | No | References (`#123`, `owner/repo#456`, URLs) |
| `scope` | string | No | Component/package scope (e.g., `core`, `api`) |
| `breaking` | boolean | No | Whether this is a breaking change |
| `score` | number | No | 0-1 notability score |

### Note Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | `upgrade`, `migration`, `deprecation`, or `info` |
| `text` | string | Yes | Instruction or note content |

---

## Category IDs

Stable identifiers for programmatic access:

| ID | Title | Description |
|----|-------|-------------|
| `breaking` | Breaking Changes | Changes requiring developer action |
| `features` | Features | New functionality |
| `fixes` | Bug Fixes | Resolved issues |
| `security` | Security | CVEs, vulnerabilities, security patches |
| `perf` | Performance | Speed, memory, efficiency improvements |
| `deps` | Dependencies | Dependency updates |
| `docs` | Documentation | Documentation changes |
| `refactor` | Refactoring | Code restructuring without behavior change |
| `chore` | Chores | Build, CI, tooling changes |
| `other` | Other | Uncategorized changes |

---

## Confidence Scoring

The `confidence` field (0-1) indicates how reliable the extracted data is:

| Score | Interpretation |
|-------|---------------|
| 0.9+ | High quality: Structured release notes or Keep-a-Changelog |
| 0.7-0.9 | Good: Release notes with some parsing ambiguity |
| 0.5-0.7 | Moderate: Commit-based extraction with Conventional Commits |
| < 0.5 | Low: Sparse data, generic commit messages |

Factors affecting confidence:
- Source quality (structured changelog > auto-generated > commits)
- Parsing success rate
- Category coverage
- Reference extraction success

---

## Generated Sources

The `generatedFrom` array indicates which sources contributed to the document:

| Source | Description |
|--------|-------------|
| `github.release` | GitHub release notes |
| `github.auto` | GitHub auto-generated release notes |
| `changelog.md` | CHANGELOG.md file |
| `commits` | Commit history between tags |
| `ai.enhanced` | AI-assisted categorization or summarization |

---

## TypeScript Types

These types are exported from `@whatsnew/types`:

```typescript
import { z } from 'zod';

export const ChangeItemSchema = z.object({
  text: z.string(),
  refs: z.array(z.string()).optional(),
  scope: z.string().optional(),
  breaking: z.boolean().optional(),
  score: z.number().min(0).max(1).optional(),
});

export const CategorySchema = z.object({
  id: z.enum([
    'breaking', 'features', 'fixes', 'security', 'perf',
    'deps', 'docs', 'refactor', 'chore', 'other',
  ]),
  title: z.string(),
  items: z.array(ChangeItemSchema),
});

export const NoteSchema = z.object({
  type: z.enum(['upgrade', 'migration', 'deprecation', 'info']),
  text: z.string(),
});

export const SourceSchema = z.object({
  platform: z.enum(['github', 'gitlab']),
  repo: z.string(),
  tag: z.string().optional(),
  commitRange: z.object({
    base: z.string(),
    head: z.string(),
  }).optional(),
});

export const WNFDocumentSchema = z.object({
  spec: z.literal('wnf/0.1'),
  source: SourceSchema,
  version: z.string().optional(),
  releasedAt: z.string().datetime().optional(),
  summary: z.string(),
  categories: z.array(CategorySchema),
  notes: z.array(NoteSchema).optional(),
  links: z.object({
    release: z.string().url().optional(),
    compare: z.string().url().optional(),
    changelog: z.string().url().optional(),
  }),
  confidence: z.number().min(0).max(1),
  generatedFrom: z.array(z.string()),
  generatedAt: z.string().datetime().optional(),
});

export type ChangeItem = z.infer<typeof ChangeItemSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type Note = z.infer<typeof NoteSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type WNFDocument = z.infer<typeof WNFDocumentSchema>;
export type CategoryId = Category['id'];
```

---

## Implementation Notes

### Deterministic First

WNF generation prioritizes deterministic extraction over AI:
1. Parse structured formats (Keep-a-Changelog, Changesets) directly
2. Use pattern matching for Conventional Commits
3. Apply AI only for classification/summarization, never invention

### Deduplication

Items appearing in multiple sources (release notes + changelog + commits) are deduplicated by:
1. Matching PR/issue references (`#123`)
2. Fuzzy text similarity
3. Commit SHA matching

### Reference Normalization

References are normalized to canonical forms:
- `#123` → Same-repo issue/PR
- `owner/repo#123` → Cross-repo reference
- Full URLs preserved for external links
