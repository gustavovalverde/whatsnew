---
status: proposed
date: 2025-12-07
story: Analysis of version tag commits polluting vitejs/vite output
---

# Filter Version Tag Commits from Commit History

## Context and Problem Statement

When aggregating changelog information using commit history augmentation, version tag commits (e.g., "v7.1.7", "v7.1.8") are included in the output. These commits represent release markers, not actual code changes, and pollute the changelog with meaningless entries.

This is distinct from the "terse developer commits" issue documented in ADR-001. Version tag commits are:
1. **Automated/release process commits** - not developer-written
2. **Predictable patterns** - follow semver format
3. **Zero information value** - they mark releases, not changes
4. **High volume** - can dominate output in repos with frequent releases

## Evidence: Real-World Example (vitejs/vite)

### Source: Commit History Between Tags

When fetching commits for vitejs/vite v7.2.6, the commit history includes:

```
v7.0.0-alpha.0
v7.0.0-beta.0
v7.0.0
v7.0.1
v7.0.2
...
v7.1.18
v7.1.19
v7.1.20
v7.2.0-beta.0
v7.2.0-beta.1
v7.2.0
v7.2.1
...
v7.2.10
v8.0.0-beta.0
```

### Resulting Output

```
Other Changes
  [-] v7.0.0-alpha.0
  [-] v7.0.0-beta.0
  [-] v7.0.0
  [-] v7.0.1
  ... (60+ version entries)
  [-] v8.0.0-beta.0
```

### Impact

- **Confidence: 63%** (should be higher for a well-documented project)
- **Quality Warning: 37% terse** (inflated by version tags)
- **Output pollution**: 60+ meaningless entries mixed with actual changes
- **User confusion**: Version tags categorized as "Other Changes"

## Root Cause Analysis

### Why This Happens

1. **Commit Range Fetching**: We fetch all commits between `base_tag` and `head_tag`
2. **Version Bump Commits Included**: Git tags create commits like "v7.1.7" or "Release v7.1.7"
3. **No Filtering**: These commits pass through extraction and categorization
4. **Falls to "Other"**: No conventional type or keywords → categorized as "other"

### Affected Repositories

Repositories with:
- Frequent patch releases
- Automated release workflows
- Version-only commit messages
- Monorepos with package-specific versions

Examples: vitejs/vite, vercel/ai (monorepo tags), any project using release-please/changesets

## Considered Options

### Option 1: Filter by Version Pattern

Filter commits matching semver patterns before processing.

**Implementation:**
```typescript
const VERSION_PATTERNS = [
  /^v?\d+\.\d+\.\d+(-[\w.]+)?$/,           // v1.2.3, 1.2.3, v1.2.3-beta.1
  /^@[\w-]+\/[\w-]+@\d+\.\d+\.\d+$/,       // @scope/package@1.2.3
  /^[\w-]+@\d+\.\d+\.\d+$/,                 // package@1.2.3
  /^release\s+v?\d+\.\d+\.\d+/i,           // Release v1.2.3
  /^bump\s+(version\s+)?to\s+v?\d+/i,      // Bump version to v1.2.3
];

function isVersionCommit(message: string): boolean {
  const trimmed = message.trim();
  return VERSION_PATTERNS.some(pattern => pattern.test(trimmed));
}

// In commit extraction
const commits = rawCommits.filter(c => !isVersionCommit(c.message));
```

**Pros:**
- Simple, fast, deterministic
- Catches most version patterns
- No false positives for descriptive commits

**Cons:**
- May miss unusual version formats
- Regex maintenance burden
- Could filter legitimate commits mentioning versions

### Option 2: Filter by Commit Type Heuristics

Detect release commits by multiple signals.

**Implementation:**
```typescript
function isReleaseCommit(commit: Commit): boolean {
  const message = commit.message.trim().toLowerCase();

  // Check message patterns
  if (/^v?\d+\.\d+\.\d+/.test(message)) return true;
  if (/^(release|bump|version)\b/.test(message)) return true;

  // Check if commit only modifies version files
  const versionFiles = ['package.json', 'version.txt', 'CHANGELOG.md'];
  if (commit.files?.every(f => versionFiles.includes(f))) return true;

  return false;
}
```

**Pros:**
- More accurate detection
- Handles edge cases better

**Cons:**
- Requires file information (additional API calls)
- More complex logic

### Option 3: Separate "Releases" Category

Instead of filtering, categorize version commits separately.

**Implementation:**
```typescript
// In categorizer
if (isVersionCommit(item.text)) {
  return { categoryId: 'releases', confidence: 'high', reason: 'version_pattern' };
}
```

**Output:**
```
Bug Fixes
  [*] Fix authentication bug (#123)

Releases (hidden by default)
  [v] v7.1.7, v7.1.8, v7.1.9... (12 releases)
```

**Pros:**
- No information loss
- User can expand if interested
- Clear separation of concerns

**Cons:**
- Adds complexity to output format
- Still fetches/processes unnecessary commits

### Option 4: Filter at Fetch Time

Skip version tag commits during the GitHub API fetch.

**Implementation:**
```typescript
async function fetchCommitsBetweenTags(base: string, head: string): Promise<Commit[]> {
  const commits = await github.compare(base, head);

  // Filter immediately, before any processing
  return commits.filter(c => !isVersionCommit(c.message));
}
```

**Pros:**
- Most efficient (less data to process)
- Clean separation of concerns
- Reduces memory usage

**Cons:**
- Filtering logic in data layer
- Harder to debug filtered commits

## Decision Outcome

**Proposed: Option 1 (Filter by Version Pattern) + Option 4 (Filter at Fetch Time)**

Filter version tag commits at the earliest point (fetch time) using pattern matching:

```typescript
// packages/utils/src/version-filter.ts
export const VERSION_COMMIT_PATTERNS = [
  /^v?\d+\.\d+\.\d+(-[\w.]+)?$/,           // v1.2.3, v1.2.3-beta.1
  /^@[\w-]+\/[\w-]+@\d+\.\d+\.\d+/,        // @scope/package@1.2.3
  /^[\w-]+@\d+\.\d+\.\d+$/,                 // package@1.2.3
  /^release\s+v?\d+\.\d+\.\d+/i,           // Release v1.2.3
  /^chore\(release\):/i,                    // chore(release): v1.2.3
  /^\[release\]/i,                          // [release] v1.2.3
];

export function isVersionTagCommit(message: string): boolean {
  const firstLine = message.split('\n')[0].trim();
  return VERSION_COMMIT_PATTERNS.some(p => p.test(firstLine));
}
```

### Expected Impact on vitejs/vite

| Metric | Before | After (Expected) |
|--------|--------|------------------|
| Confidence | 63% | ~80% |
| Terse Warning | 37% | <20% (no warning) |
| "Other" Items | 60+ | ~5 |
| Signal-to-Noise | Low | High |

## Implementation Plan

### Phase 1: Add Version Filter Utility

1. Create `packages/utils/src/version-filter.ts`
2. Add `isVersionTagCommit()` function
3. Export from utils index
4. Add unit tests

### Phase 2: Apply Filter in Commit Source

1. Update `packages/core/src/sources/commit-history.ts`
2. Filter commits after fetching, before extraction
3. Log filtered count for debugging

### Phase 3: Validation

1. Test against vitejs/vite - verify improved confidence
2. Test against vercel/ai (monorepo) - verify package tags handled
3. Run full E2E suite - verify no regressions

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Filter legitimate commits | Low | Medium | Conservative patterns, log filtered commits |
| Miss unusual version formats | Medium | Low | Extensible pattern list, monitor feedback |
| Monorepo tags filtered incorrectly | Medium | Medium | Test with vercel/ai, handle scoped patterns |

## Related

- [ADR-001: Input Quality Limitations](./001-input-quality-limitations.md) - Different issue: terse developer commits
- Issue: vitejs/vite version tag pollution (2025-12-07)
