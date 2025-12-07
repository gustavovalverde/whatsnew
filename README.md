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
npx @whatsnew/cli@latest vercel/ai

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

# Or run directly with npx (use @latest to avoid caching issues)
npx @whatsnew/cli@latest vercel/ai
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
        run: npx @whatsnew/cli@latest vercel/ai --since v3.0.0 --format markdown >> $GITHUB_STEP_SUMMARY
```

## How It Works

whatsnew is **deterministic-first**: it uses rule-based parsing before considering AI. This makes results fast, reproducible, and free to run.

### Multi-Source Fallback

```
GitHub Releases  →  CHANGELOG.md  →  Commit History  →  AI Enhancement
    (primary)        (secondary)       (tertiary)        (when needed)
```

1. **Release notes** – Parsed with format detection (Changesets, Keep-a-Changelog, Conventional Commits)
2. **Changelog files** – Falls back to CHANGELOG.md if release notes are sparse
3. **Commit history** – Always available as a last resort
4. **AI enhancement** – Optional fallback when deterministic parsing produces low-quality results

Each response includes a confidence score so you know how reliable the data is.

### When AI Kicks In

AI enhancement is **optional** and only activates when:
- An AI API key is configured (see [Environment Variables](#environment-variables))
- Deterministic parsing produces low-quality results

**What triggers AI fallback:**

| Condition | Example |
|-----------|---------|
| **Low confidence** (<0.6) | Parser uncertain about categorization |
| **All items uncategorized** | Everything ends up in "other" category |
| **High uncategorized ratio** (>80%) | Most items couldn't be classified |
| **Empty extraction** | 150+ chars of content but no items extracted |
| **Missing items** | Content suggests more items than were extracted |

**Real-world examples where AI helps:**

- Repos with free-form release notes (no consistent format)
- Legacy projects with inconsistent changelog styles
- Auto-generated notes that don't follow conventions
- Non-English changelogs that deterministic rules miss

**Without AI configured:** whatsnew still works perfectly—you just get deterministic results with lower confidence scores for edge cases.

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

whatsnew supports multiple configuration methods. Priority order (highest first):
1. CLI flags (`--github-token`, `--ai-key`)
2. Environment variables
3. Config file (`~/.config/whatsnew/config.json`)

### Quick Setup

```bash
# Set your GitHub token (one-time)
whatsnew config set github_token ghp_xxxxxxxxxxxx

# Optional: Set AI API key for enhanced parsing
whatsnew config set ai.api_key sk-ant-xxxxxxxxxxxx

# View current configuration
whatsnew config list
```

### Config File

Located at `~/.config/whatsnew/config.json` (XDG-compliant):

```json
{
  "github_token": "ghp_xxx",
  "ai": {
    "provider": "anthropic",
    "api_key": "sk-ant-xxx"
  }
}
```

### Config Commands

```bash
whatsnew config set <key> <value>   # Set a value (validates tokens)
whatsnew config list                # Show current config (tokens masked)
whatsnew config path                # Show config file location
whatsnew config unset <key>         # Remove a value
```

### Environment Variables

Environment variables override config file values:

```bash
# GitHub API access
GITHUB_TOKEN=ghp_xxx              # Recommended: 5,000 req/hr vs 60 without

# Display options
NO_COLOR=1                        # Disable colored output

# AI Enhancement (optional - set ONE of these to enable)
ANTHROPIC_API_KEY=sk-ant-xxx      # Direct Anthropic API
OPENAI_API_KEY=sk-xxx             # Direct OpenAI API
AI_GATEWAY_API_KEY=xxx            # Vercel AI Gateway (multi-provider)
AI_PROVIDER=anthropic             # anthropic or openai (default: anthropic)
```

### CLI Flags

For one-off overrides without modifying config:

```bash
whatsnew vercel/ai --github-token ghp_xxx
whatsnew vercel/ai --ai-key sk-ant-xxx
```

**Note:** AI is auto-enabled when an API key is present. It only runs when deterministic parsing produces low-quality results (see [When AI Kicks In](#when-ai-kicks-in)).

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
