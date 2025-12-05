# CLI Strategy

This document defines the architecture, distribution, and developer experience patterns for the `whatsnew` command-line tool.

> **Status:** Phase 1 MVP complete. See Implementation Status below for details.

---

## Overview

The `whatsnew` CLI provides developers a fast way to check what changed in their dependencies directly from the terminal.

### Core Use Cases
1. Check latest release for a GitHub repository
2. Compare changes between two versions or dates
3. Filter monorepo releases by package name

---

## Implementation Status

### Implemented (Phase 1 MVP)

| Feature | Status | Notes |
|---------|--------|-------|
| Basic argument parsing | Done | Native `process.argv` |
| `--since`, `--until`, `--from`, `--to` | Done | Auto-detects date vs version |
| `--package` filter | Done | Monorepo support |
| `--format text\|json\|markdown` | Done | All three formatters |
| `--help`, `--version` | Done | |
| Version in target (`repo@v1.0.0`) | Done | |
| Partial date expansion | Done | `2024` → Jan 1, `2024-06` → June 1 |
| Color output with `NO_COLOR` support | Done | |
| Error hints | Done | Suggests GITHUB_TOKEN on rate limit |
| Text formatter with box drawing | Done | Unicode box drawing, colored categories |
| JSON formatter | Done | Pretty-printed WNF |
| Markdown formatter | Done | GitHub-flavored |

### Not Yet Implemented (Future)

| Feature | Phase | Notes |
|---------|-------|-------|
| `--npm` flag | Phase 2 | npm registry → GitHub resolution |
| `--deps` flag | Phase 2 | Read package-lock.json, show changes |
| `--breaking` filter | Phase 2 | Show only breaking changes |
| `--clear-cache` | Phase 2 | Local caching not implemented |
| `--offline` mode | Phase 2 | Requires caching |
| Config file (`~/.whatsnewrc`) | Phase 2 | |
| Multiple targets | Phase 2 | Currently single target only |
| Exit codes 2/3/4 | Phase 2 | Currently all errors exit 1 |

### Distribution Status

| Channel | Status | Notes |
|---------|--------|-------|
| npm package | Done | `@whatsnew/cli` |
| Homebrew formula | Done | `brew tap gustavovalverde/wnf` |
| Standalone binaries | Done | GitHub Releases (5 platforms) |

---

## Command Design

### Basic Usage

```bash
# Check latest release for a GitHub repo
whatsnew vercel/ai

# Check specific version
whatsnew vercel/ai@v4.0.0

# Check what changed since a version
whatsnew vercel/ai --since v3.0.0
whatsnew vercel/ai --since v3.0.0 --until v4.0.0

# Check what changed since a date (auto-detected)
whatsnew vercel/ai --since 2024           # since Jan 1, 2024
whatsnew vercel/ai --since 2024-06        # since June 1, 2024

# Filter monorepo by package
whatsnew vercel/ai --package @ai-sdk/openai

# Output formats
whatsnew vercel/ai --format json
whatsnew vercel/ai --format markdown
```

### Current Flags

```
ARGUMENTS
  <target>            GitHub repo (owner/repo), optionally with @version

RANGE (auto-detects date vs version)
  --since, --from     Starting point: date (2024, 2024-06) or version (v3.0.0)
  --until, --to       Ending point (default: latest/today)

OPTIONS
  --package, -p       Filter monorepo by package name
  --format, -f        Output format: text (default), json, markdown
  --help, -h          Show help
  --version, -v       Show CLI version
```

---

## Version and Date Ranges

### Auto-Detection Logic

```typescript
const DATE_PATTERN = /^\d{4}(-\d{2})?(-\d{2})?$/;

function isDateLike(value: string): boolean {
  return DATE_PATTERN.test(value);
}
```

| Input | Detected As | Resolved To |
|-------|-------------|-------------|
| `2024` | Date | `2024-01-01` |
| `2024-06` | Date | `2024-06-01` |
| `2024-06-15` | Date | `2024-06-15` |
| `v3.0.0` | Version | `v3.0.0` |
| `3.0.0` | Version | `3.0.0` |

### Default Behavior

```bash
# Version: defaults to "latest"
whatsnew vercel/ai --since v3.0.0
# → All releases from v3.0.0 to latest

# Date: defaults to "today"
whatsnew vercel/ai --since 2024
# → All releases from Jan 1, 2024 to today
```

---

## Architecture

### Actual Package Structure

```
packages/cli/
├── src/
│   ├── index.ts           # Entry point exports
│   ├── cli.ts             # Main CLI logic
│   ├── args.ts            # Argument parsing
│   ├── range-parser.ts    # Date/version range parsing
│   ├── formatters/
│   │   ├── text.ts        # Terminal output with colors
│   │   ├── json.ts        # JSON output
│   │   └── markdown.ts    # Markdown output
│   └── utils/
│       ├── colors.ts      # ANSI colors, NO_COLOR support
│       └── errors.ts      # Error formatting with hints
├── bin/
│   └── whatsnew.ts        # Executable entry
├── tests/                 # 8 test files
├── package.json
└── tsconfig.json
```

### Dependency Graph

```
@whatsnew/cli
    ├── @whatsnew/core     # ReleaseService, GitHubClient
    ├── @whatsnew/types    # WNF schema types
    └── date-fns           # Partial date parsing
```

---

## Output Formatting

### Terminal Output (Default)

```
┌─────────────────────────────────────────────────┐
│ vercel/ai v4.0.0 → v4.1.0                       │
├─────────────────────────────────────────────────┤
│ BREAKING CHANGES                                │
│   • Removed deprecated `useCompletion` hook     │
│   • Changed `streamText` return type            │
├─────────────────────────────────────────────────┤
│ FEATURES                                        │
│   • Added `useObject` hook for structured data  │
│   • New `anthropic` provider                    │
├─────────────────────────────────────────────────┤
│ FIXES                                           │
│   • Fixed memory leak in streaming responses    │
└─────────────────────────────────────────────────┘

Confidence: 92% | Sources: GitHub Release, CHANGELOG.md
```

### JSON Output (`--format json`)

Returns the full WNF document structure.

### Markdown Output (`--format markdown`)

```markdown
## vercel/ai v4.0.0 → v4.1.0

### Breaking Changes
- Removed deprecated `useCompletion` hook
- Changed `streamText` return type

### Features
- Added `useObject` hook for structured data
```

---

## Error Handling

### Current Implementation

```bash
$ whatsnew nonexistent/repo

Error: Repository 'nonexistent/repo' not found

Hint: Check the repository name and try again.
```

```bash
$ whatsnew vercel/ai  # without GITHUB_TOKEN

Warning: GitHub API rate limit low
Hint: Set GITHUB_TOKEN for higher limits (5,000 req/hr vs 60)
```

---

## Configuration

### Environment Variables

```bash
GITHUB_TOKEN=ghp_xxx    # GitHub API authentication (recommended)
NO_COLOR=1              # Disable colors (standard)
```

---

## References

- [Command Line Interface Guidelines](https://clig.dev/)
- [date-fns](https://date-fns.org/) - Partial date parsing
- [Bun Build & Compile](https://bun.sh/docs/bundler)

---

*Last updated: 2025-12-06*
