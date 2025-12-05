# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

What's New (WNF) is a changelog intelligence platform that parses release notes and commit histories from GitHub/GitLab to generate machine-readable changelog data in the WNF format.

## Commands

```bash
# Build all packages
bun run build

# Run all tests
bun run test

# Run tests for a specific package
bun run --filter @whatsnew/parsers test

# Run a single test file
bun run --filter @whatsnew/parsers test format-detector.spec.ts

# Watch mode during development
bun run --filter @whatsnew/parsers test:watch

# Type check all packages
bun run typecheck

# Lint with Biome
bun run lint

# Start API dev server
bun run dev
```

## Architecture

Bun-based monorepo with layered package dependencies:

```
@whatsnew/types    → Foundation: WNF v0.1 schema, Zod schemas, extracted types
       ↓
@whatsnew/utils    → Shared utilities: Result type, text normalization, reference extraction
       ↓
@whatsnew/parsers  → Extractors + Universal Categorizer (see below)
       ↓
@whatsnew/core     → Business logic: ReleaseService, GitHubClient, DataAggregator
       ↓
@whatsnew/api      → HTTP API: Hono framework, routes, middleware
```

### Extractors + Universal Categorizer Pattern

The parsers package follows a separation of concerns:

1. **Extractors** (`packages/parsers/src/extractors/`) - Format-specific extraction only
   - `extractChangesets()` - Changesets format
   - `extractKeepAChangelog()` - Keep-a-Changelog format
   - `extractGitHubAuto()` - GitHub auto-generated releases
   - `extractConventionalCommits()` - Conventional commits
   - `extractGeneric()` - Generic markdown format

2. **Universal Categorizer** (`packages/parsers/src/categorizer/`) - Consistent categorization
   - 4-tier inference: explicit breaking → conventional commit type → keyword analysis → source hint
   - Same text = same category, regardless of source format
   - `categorizeItems(items)` - converts extracted items to WNF categories

### Key Patterns

- **Multi-Source Fallback**: GitHub releases → CHANGELOG.md → Commit history → AI inference
- **Confidence Scoring**: 0-1 numeric value indicating categorization reliability
- **Monorepo Support**: Package filtering via `?package=name` query param, auto-detection
- **Result Type**: Explicit error handling with `Result<T, E>` (from @whatsnew/utils)

### API Endpoint

```
GET /v1/repos/github/:owner/:repo/releases/latest/whats-new?package=name
```

## File Organization

```
packages/[name]/
├── src/           # Source files, index.ts exports public API
├── tests/         # Tests matching *.spec.ts pattern
├── tsconfig.json  # With project references
└── vitest.config.ts
```

### Categorizer Module Structure

```
packages/parsers/src/categorizer/
├── index.ts       # Re-exports only
├── categorize.ts  # Main categorizeItems() function
├── inference.ts   # 4-tier inference logic
├── keywords.ts    # Keyword analysis
└── signals.ts     # Constants (CATEGORY_SIGNALS, CATEGORY_TITLES, etc.)
```

## Configuration

- **Runtime**: Bun 1.3.1+
- **TypeScript**: ES2022, strict mode, composite projects
- **Testing**: Vitest with coverage (text, json-summary, lcov)
- **Linting**: Biome (formatter + linter)
- **API Environment**: See `packages/api/.env.example` for required variables (GITHUB_TOKEN, AI settings)
