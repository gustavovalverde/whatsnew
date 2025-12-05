# Multi-Source Aggregation Strategy

> **Note**: While this document uses "fallback" terminology for simplicity, the actual implementation uses an **augmentation strategy** - commits are always fetched and merged, not just used as a fallback.

## Problem Statement

Not all repositories use GitHub Releases:
- **python/cpython** - Uses git tags only, no GitHub releases
- **golang/go** - Uses git tags only, no GitHub releases
- **torvalds/linux** - Uses git tags only, no GitHub releases

These are major projects with valuable release information stored elsewhere:
- Well-maintained CHANGELOG.md files
- Structured commit history with conventional commit messages
- Tag annotations with release notes

## Data Sources (Priority Order)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Multi-Source Fallback Chain                   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  1. GitHub Release                                       │    │
│  │     - GET /repos/{owner}/{repo}/releases/latest          │    │
│  │     - Highest signal when available                      │    │
│  │     - Confidence: 0.6-0.9 based on format                │    │
│  └────────────────────────┬────────────────────────────────┘    │
│                           │ fallback if:                         │
│                           │ - No release exists                  │
│                           │ - Body empty/minimal (<50 chars)     │
│                           │ - Confidence < 0.5                   │
│                           ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  2. CHANGELOG.md File                                    │    │
│  │     - GET /repos/{owner}/{repo}/contents/CHANGELOG.md    │    │
│  │     - Try: CHANGELOG.md, CHANGELOG, HISTORY.md,          │    │
│  │            CHANGES.md, NEWS.md, RELEASES.md              │    │
│  │     - Parse with Keep-a-Changelog parser                 │    │
│  │     - Find section matching requested version            │    │
│  │     - Confidence: 0.85 (structured format)               │    │
│  └────────────────────────┬────────────────────────────────┘    │
│                           │ fallback if:                         │
│                           │ - No changelog file exists           │
│                           │ - Version section not found          │
│                           ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  3. Commits Between Tags                                 │    │
│  │     - GET /repos/{owner}/{repo}/compare/{prev}...{tag}   │    │
│  │     - Find previous tag for comparison                   │    │
│  │     - Parse commit messages (conventional commits)       │    │
│  │     - Group by type (feat, fix, etc.)                    │    │
│  │     - Confidence: 0.6-0.75 based on commit format        │    │
│  │     - ALWAYS available (universal fallback)              │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Quality Assessment Criteria

### When to use fallback:

| Condition | Action |
|-----------|--------|
| No GitHub release exists | Try CHANGELOG.md |
| Release body empty or < 50 chars | Try CHANGELOG.md |
| Release confidence < 0.5 | Try CHANGELOG.md |
| No CHANGELOG.md found | Try commits |
| Version not in CHANGELOG | Try commits |

### Confidence Scoring:

| Source | Format | Confidence |
|--------|--------|------------|
| GitHub Release | Changesets / Keep-a-Changelog | 0.9 |
| GitHub Release | GitHub Auto-Generated | 0.9 |
| GitHub Release | Conventional Commits | 0.85 |
| GitHub Release | Generic with headers | 0.7 |
| GitHub Release | Minimal/no structure | 0.5-0.6 |
| CHANGELOG.md | Well-structured | 0.85 |
| Commits | Conventional commits | 0.75 |
| Commits | Mixed/unstructured | 0.6 |

## Implementation

### New Files

```
packages/core/src/
├── sources/
│   ├── types.ts                 # DataSource interface
│   ├── github-release.source.ts # Existing logic extracted
│   ├── changelog-file.source.ts # NEW
│   └── commit-history.source.ts # NEW
├── aggregator/
│   └── data-aggregator.ts       # Orchestrates sources
└── services/
    └── release.service.ts       # Uses aggregator
```

### DataSource Interface

```typescript
interface DataSource {
  name: string;
  priority: number;

  /**
   * Attempt to fetch release data from this source
   * Returns null if source not available or doesn't have data
   */
  fetch(owner: string, repo: string, tag?: string): Promise<SourceResult | null>;
}

interface SourceResult {
  categories: Category[];
  confidence: number;
  source: string;  // e.g., "github.release", "changelog.md", "commits"
  metadata?: {
    version?: string;
    date?: string;
    compareUrl?: string;
  };
}
```

### DataAggregator

```typescript
class DataAggregator {
  private sources: DataSource[];

  constructor() {
    // Sources in priority order
    this.sources = [
      new GitHubReleaseSource(),
      new ChangelogFileSource(),
      new CommitHistorySource(),
    ];
  }

  async getRelease(owner: string, repo: string, tag?: string): Promise<WNFDocument> {
    for (const source of this.sources) {
      const result = await source.fetch(owner, repo, tag);

      // Use this source if:
      // 1. Data exists
      // 2. Confidence meets threshold (0.5 for releases, 0.4 for fallbacks)
      if (result && result.confidence >= this.getThreshold(source)) {
        return this.toWNFDocument(result, owner, repo, tag);
      }
    }

    // Should never reach here (commits always available)
    throw new Error("No release data available");
  }
}
```

### CHANGELOG.md Source

```typescript
class ChangelogFileSource implements DataSource {
  name = "changelog.md";
  priority = 2;

  // Files to try in order
  private readonly CHANGELOG_FILES = [
    "CHANGELOG.md",
    "CHANGELOG",
    "HISTORY.md",
    "CHANGES.md",
    "NEWS.md",
    "RELEASES.md",
    "docs/CHANGELOG.md",
    "doc/CHANGELOG.md",
  ];

  async fetch(owner: string, repo: string, tag?: string): Promise<SourceResult | null> {
    // 1. Find changelog file
    const content = await this.findChangelog(owner, repo);
    if (!content) return null;

    // 2. Parse with Keep-a-Changelog parser
    const entries = parseKeepAChangelog(content);
    if (entries.length === 0) return null;

    // 3. Find version matching tag
    const version = tag?.replace(/^v/, "");
    const entry = version
      ? entries.find(e => e.version === version || e.version === `v${version}`)
      : entries[0]; // Latest if no tag specified

    if (!entry) return null;

    // 4. Convert to categories
    return {
      categories: this.convertToCategories(entry),
      confidence: 0.85,
      source: "changelog.md",
      metadata: { version: entry.version, date: entry.date },
    };
  }
}
```

### Commit History Source

```typescript
class CommitHistorySource implements DataSource {
  name = "commits";
  priority = 3;

  async fetch(owner: string, repo: string, tag?: string): Promise<SourceResult | null> {
    // 1. Get tags to find previous version
    const tags = await this.github.getTags(owner, repo);
    const currentTag = tag || tags[0]?.name;
    const previousTag = this.findPreviousTag(tags, currentTag);

    if (!currentTag) return null;

    // 2. Get commits between tags
    const comparison = await this.github.compare(
      owner, repo,
      previousTag || `${currentTag}~50`, // Fallback: last 50 commits
      currentTag
    );

    // 3. Parse commit messages
    const commits = comparison.commits.map(c => ({
      message: c.commit.message,
      sha: c.sha.slice(0, 7),
      author: c.author?.login,
    }));

    // 4. Categorize using conventional commits parser
    const categories = parseConventionalCommits(commits);

    // 5. Calculate confidence based on commit format
    const hasConventional = commits.some(c =>
      /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore)(\(.+\))?!?:/.test(c.message)
    );

    return {
      categories,
      confidence: hasConventional ? 0.75 : 0.6,
      source: "commits",
      metadata: {
        compareUrl: comparison.html_url,
        commitCount: commits.length,
      },
    };
  }
}
```

## API Response Changes

The `generatedFrom` field already exists and will indicate the source:

```json
{
  "spec": "wnf/0.1",
  "source": {
    "platform": "github",
    "repo": "python/cpython",
    "tag": "v3.12.0"
  },
  "version": "3.12.0",
  "categories": [...],
  "confidence": 0.85,
  "generatedFrom": ["changelog.md"],  // Indicates source used
  "generatedAt": "2024-01-15T10:00:00Z"
}
```

Multiple sources can be indicated if merged:
```json
"generatedFrom": ["github.release", "commits"]
```

## Test Cases

### Repos that should use CHANGELOG.md:
- `golang/go` - Has excellent HISTORY file
- `python/cpython` - Has NEWS file with release notes

### Repos that should use commits:
- `torvalds/linux` - Massive commit history, no changelog
- Any repo without releases or changelog

### Repos that should use GitHub release:
- `facebook/react` - Well-structured releases
- `vercel/ai` - Changesets format

## Implementation Order

1. **Phase 1: CHANGELOG.md Source** (High value, moderate effort)
   - Add changelog file fetcher to GitHub client
   - Create ChangelogFileSource
   - Integrate into ReleaseService
   - Test with `golang/go`, `python/cpython`

2. **Phase 2: Commit History Source** (Universal fallback)
   - Add compare API to GitHub client
   - Create CommitHistorySource
   - Update conventional commits parser for commit objects
   - Test with `torvalds/linux`

3. **Phase 3: DataAggregator** (Orchestration)
   - Extract sources into separate files
   - Create DataAggregator class
   - Add quality threshold logic
   - Update ReleaseService to use aggregator

## Edge Cases

| Scenario | Handling |
|----------|----------|
| No previous tag exists | Use first 50 commits for comparison |
| CHANGELOG has different version format | Normalize versions (v1.0.0 == 1.0.0) |
| Tag doesn't match any CHANGELOG entry | Fall back to commits |
| Private repo without token | Return error with clear message |
| Rate limit exceeded | Return cached data or error |

## Performance Considerations

- **Caching**: Cache changelog files (they change less frequently than releases)
- **Parallel fetching**: Could fetch multiple sources in parallel for faster response
- **ETag support**: Use GitHub ETags to avoid re-fetching unchanged content
