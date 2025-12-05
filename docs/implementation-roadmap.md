# What's New: Implementation Roadmap

## Project Overview

**What's New** is a changelog intelligence platform that aggregates, normalizes, and understands software changes across multiple sources to help developers understand what changed in their dependencies.

**Key Differentiator**: Consumer-first (vs. competitors being author-first)

**Core Insight**: 85% of releases are sparse. The MVP handles any repository, not just those with structured changelogs.

---

## Implementation Status

```
Phase 1: Foundation & MVP        ✅ COMPLETE
    └── Multi-source aggregation, format parsers, API endpoints

Phase 2: AI Enhancement          ✅ COMPLETE
    └── AI-powered categorization via Vercel AI SDK (Anthropic/OpenAI)

Phase 3: CLI & Distribution      ✅ COMPLETE (MVP)
    └── CLI tool, npm package, Homebrew, standalone binaries

Phase 4: User Experience         📋 PLANNED
    └── Web UI, caching layer, enhanced CLI features
```

---

## Phase 1: Foundation & MVP (Complete)

### Implemented Features

- **Multi-Source Aggregation**: GitHub releases → CHANGELOG.md → Commit history
- **Format Parsers**: Keep-a-Changelog, Conventional Commits, Changesets, GitHub Auto-Generated, Generic
- **API Endpoints**: Latest release, release by tag, date range queries
- **Monorepo Support**: Package filtering via `?package=name` query param
- **Quality Scoring**: Confidence scores with source attribution
- **Deduplication**: Smart merging across sources using refs and text similarity

### Package Structure

```
@whatsnew/types    → WNF schema, Zod validation
@whatsnew/utils    → Shared utilities (Result type, normalization)
@whatsnew/parsers  → Format detection, extractors, categorizer
@whatsnew/core     → ReleaseService, DataAggregator, sources
@whatsnew/api      → Hono HTTP API
@whatsnew/cli      → Command-line interface
```

---

## Phase 2: AI Enhancement (Complete)

AI enhancement is implemented as an optional layer that activates when deterministic parsing produces low-quality results.

### Implemented Components

| Component | Location | Status |
|-----------|----------|--------|
| QualityAssessor | `@whatsnew/core/src/ai/` | Done |
| AIExtractor | `@whatsnew/core/src/ai/` | Done |
| AnchorExtractor | `@whatsnew/core/src/ai/` | Done |
| CategoryInferrer | `@whatsnew/parsers/src/categorizer/` | Done |

### AI Implementation

- **Provider**: Vercel AI SDK with Anthropic (Claude Haiku) or OpenAI (GPT-4o-mini)
- **Trigger**: QualityAssessor detects low confidence or poor categorization
- **Guardrails**: Grounded generation with anchor extraction prevents hallucination
- **Configuration**: Via environment variables (`AI_PROVIDER`, `AI_MODEL`)

---

## Phase 3: CLI & Distribution (Complete - MVP)

### CLI Features Implemented

| Feature | Status |
|---------|--------|
| Basic commands (`whatsnew owner/repo`) | Done |
| Version/date ranges (`--since`, `--until`) | Done |
| Package filtering (`--package`) | Done |
| Output formats (text, JSON, markdown) | Done |
| Error handling with hints | Done |
| `NO_COLOR` support | Done |

### Distribution Channels

| Channel | Status |
|---------|--------|
| npm package (`@whatsnew/cli`) | Done |
| Homebrew formula | Done |
| Standalone binaries (5 platforms) | Done |

### CLI Features Not Yet Implemented

- `--npm` flag (npm registry lookup)
- `--deps` flag (check updated dependencies)
- `--breaking` filter
- Local caching
- Config file (`~/.whatsnewrc`)

---

## Phase 4: User Experience (Planned)

### Web UI
- Search interface for repositories
- Release comparison view
- Output format toggle (JSON/Markdown)

### Enhanced CLI
- `--npm` flag with npm registry → GitHub resolution
- `--deps` flag to check updated dependencies
- Local file caching
- Config file support

### Caching Layer
- ETag-based caching for GitHub API
- Response caching for repeat queries
- Redis/Upstash for serverless deployment

---

## Success Criteria

| Metric | Target | Status |
|--------|--------|--------|
| Sparse release handling | Useful data for 80%+ of repos | Achieved |
| Breaking change detection | 90% precision | Achieved |
| Response time | <5s fresh | Achieved |
| CLI distribution | npm + Homebrew + binaries | Achieved |

---

## Test Repositories

```typescript
const testRepos = [
  { repo: 'vercel/ai', expectSparse: true, expectCommitFallback: true },
  { repo: 'facebook/react', expectBreaking: true, expectFeatures: true },
  { repo: 'vercel/next.js', expectBreaking: true, expectMigration: true },
  { repo: 'expressjs/express', expectKeepAChangelog: true },
];
```

---

## Risk Mitigation

| Risk | Mitigation | Status |
|------|------------|--------|
| GitHub API rate limits | Rate limit tracking, conditional requests | Implemented |
| AI hallucinations | Grounded generation with anchor extraction | Implemented |
| Performance | Parallel fetching, early termination | Implemented |
| Distribution | npm + Homebrew + binaries | Implemented |

---

*Last updated: 2025-12-06*
