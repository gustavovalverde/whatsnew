# whatsnew

[![npm version](https://img.shields.io/npm/v/@whatsnew/cli.svg)](https://www.npmjs.com/package/@whatsnew/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

> Finally understand what changed in your dependencies—without leaving your terminal.

## Why whatsnew?

- **No more tab juggling** – One command aggregates releases, changelogs, and commits into a single summary
- **Works with any repo** – Even poorly documented projects (automatic fallback to commit history)
- **Date or version ranges** – "What changed since v3.0?" or "since last month?"
- **CI/CD ready** – JSON output, meaningful exit codes, post-update hooks
- **AI-enhanced** – Optional categorization of breaking changes, features, fixes, and security updates

## Quick Start

```bash
# Check what's new in a GitHub repo
npx @whatsnew/cli vercel/ai

# Check what changed since a version
whatsnew facebook/react --since v18.2.0

# Check what changed since a date
whatsnew vercel/next.js --since 2024-06

```

## Use Cases

| Question | Command |
|----------|---------|
| What's new in React's latest release? | `whatsnew facebook/react` |
| What changed between two versions? | `whatsnew facebook/react --since v18.2.0 --until v18.3.0` |
| What's new this year? | `whatsnew vercel/next.js --since 2024` |
| What's new since last month? | `whatsnew vercel/ai --since 2024-11` |
| Filter monorepo by package | `whatsnew vercel/ai --package @ai-sdk/openai` |

## Installation

```bash
# npm
npm install -g @whatsnew/cli

# pnpm
pnpm add -g @whatsnew/cli

# bun
bun add -g @whatsnew/cli

# Or run directly with npx
npx @whatsnew/cli vercel/ai
```

### Homebrew

```bash
brew tap gustavovalverde/wnf https://github.com/gustavovalverde/wnf
brew install whatsnew
```

### Standalone Binary

Download from [GitHub Releases](https://github.com/gustavovalverde/wnf/releases) for your platform:
- `whatsnew-darwin-arm64` (macOS Apple Silicon)
- `whatsnew-darwin-x64` (macOS Intel)
- `whatsnew-linux-x64` (Linux x64)
- `whatsnew-linux-arm64` (Linux ARM64)
- `whatsnew-windows-x64.exe` (Windows)

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/changelog-check.yml
name: Changelog Check
on:
  pull_request:
    paths:
      - 'package.json'

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Show dependency changes
        run: npx @whatsnew/cli vercel/ai --since v3.0.0 --format markdown >> $GITHUB_STEP_SUMMARY
```

## How It Works

whatsnew uses a multi-source fallback strategy to provide useful output regardless of how well a project documents its releases:

```
GitHub Releases  →  CHANGELOG.md  →  Commit History
    (primary)        (secondary)       (fallback)
```

1. **Release notes** – Parsed with format detection (Changesets, Keep-a-Changelog, Conventional Commits)
2. **Changelog files** – Falls back to CHANGELOG.md if release notes are sparse
3. **Commit history** – Always available as a last resort

Each response includes a confidence score so you know how reliable the data is.

## Output Formats

### Terminal (default)

```
vercel/ai v4.0.0 → v4.1.0

BREAKING CHANGES
  • Removed deprecated `useCompletion` hook
  • Changed `streamText` return type

FEATURES
  • Added `useObject` hook for structured data
  • New `anthropic` provider

FIXES
  • Fixed memory leak in streaming responses

Confidence: 0.92 | Sources: GitHub Release, CHANGELOG.md
```

### JSON (`--format json`)

```bash
whatsnew vercel/ai --format json | jq '.changes.breaking'
```

### Markdown (`--format markdown`)

```bash
whatsnew vercel/ai --format markdown >> CHANGELOG_SUMMARY.md
```

## API

For programmatic access, whatsnew also provides an HTTP API:

```bash
# Latest release
curl https://api.whatsnew.dev/v1/repos/github/facebook/react/releases/latest/whats-new

# Since a version
curl https://api.whatsnew.dev/v1/repos/github/vercel/ai/releases/whats-new?since=v3.0.0

# Monorepo package filter
curl https://api.whatsnew.dev/v1/repos/github/vercel/ai/releases/latest/whats-new?package=@ai-sdk/openai
```

## Packages

whatsnew is built as a monorepo. Use individual packages for programmatic access:

| Package | Description |
|---------|-------------|
| [@whatsnew/cli](https://www.npmjs.com/package/@whatsnew/cli) | Command-line interface |
| [@whatsnew/core](https://www.npmjs.com/package/@whatsnew/core) | Business logic, GitHub client, data aggregation |
| [@whatsnew/parsers](https://www.npmjs.com/package/@whatsnew/parsers) | Format parsers (Changesets, Keep-a-Changelog, etc.) |
| [@whatsnew/types](https://www.npmjs.com/package/@whatsnew/types) | TypeScript types and WNF schema |

## Configuration

### Environment Variables

```bash
GITHUB_TOKEN=ghp_xxx    # Recommended: 5,000 req/hr vs 60 without
NO_COLOR=1              # Disable colors
```

## Development

```bash
# Prerequisites: Bun 1.3.1+, Node 24+
bun install

# Build all packages
bun run build

# Run tests
bun run test

# Type check
bun run typecheck

# Lint
bun run lint
```

## Documentation

- [Data Flow](./docs/architecture/data-flow.md) – How multi-source aggregation works
- [CLI Architecture](./docs/architecture/cli.md) – Command design and implementation
- [WNF Specification](./docs/wnf-specification.md) – Machine-readable changelog format
- [Implementation Roadmap](./docs/implementation-roadmap.md) – Development phases

## License

MIT
