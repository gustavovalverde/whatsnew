---
status: proposed
date: 2025-12-07
story: Analysis of low-quality commit messages in shadcn-ui/ui output
---

# Input Quality Limitations and Mitigation Strategies

## Context and Problem Statement

whatsnew aggregates changelog information from multiple sources (GitHub releases, CHANGELOG.md, commit history). When source repositories have low-quality commit messages, the output reflects this limitation—a classic "garbage in, garbage out" (GIGO) scenario.

Example from shadcn-ui/ui where commit messages like `fix`, `lint`, `font size` produce unhelpful changelog entries that provide no actionable information to users.

## Evidence: Real-World Examples

### Source Commits (shadcn-ui/ui)

```
fix                    # No description
fix                    # Repeated
fix: lint              # What was linted?
fix: sidebar           # What about sidebar?
fix: spacing           # Where?
fix: minor updates     # What updates?
```

### Resulting Output

```
Bug Fixes
  [*] font size
  [*] lint
  [*] sidebar
```

These entries tell users nothing about what actually changed.

### Contrast: High-Quality Input

```
fix: do not install baseStyle when adding registry:theme (#8900)
fix: update color value detection for cssVars (#8901)
Fix utils import transform when workspace alias does not start with @ (#7557)
```

Produces useful output:

```
Bug Fixes
  [*] do not install base style when adding themes (#8900)
  [*] update color value detection for cssVars (#8901)
  [*] Fix utils import transform when workspace alias does not start with @ (#7557)
```

## Priorities and Constraints

- **Truthfulness**: Output must accurately reflect source data; we cannot fabricate information
- **Performance**: Solutions must not significantly impact response time for well-documented repos
- **Cost**: AI enhancement has API costs; should be proportional to value added
- **User trust**: Users should understand when output quality is limited by input quality
- **Determinism**: Prefer reproducible, rule-based approaches over non-deterministic AI

## Considered Options

### Option 1: Status Quo (Document Limitation)

Keep current behavior but clearly document that output quality depends on input quality.

**Pros:**
- Zero implementation cost
- No performance impact
- Truthful representation of source data

**Cons:**
- Users may blame the tool for poor output
- No improvement to user experience

### Option 2: Minimum Description Length Filter

Skip or group entries below a character threshold (e.g., <10 characters).

**Implementation:**
```typescript
const MIN_DESCRIPTION_LENGTH = 10;
items.filter(item => item.text.length >= MIN_DESCRIPTION_LENGTH);
```

**Pros:**
- Simple to implement
- Fast, no external dependencies
- Reduces noise in output

**Cons:**
- May hide legitimate short entries ("Add README")
- Arbitrary threshold
- Information loss

### Option 3: Quality Scoring with Warning

Calculate quality score per item and aggregate to confidence. Surface warnings for low-quality items.

**Implementation:**
```typescript
function calculateItemQuality(item: ExtractedItem): number {
  let score = 1.0;

  // Penalize very short descriptions
  if (item.text.length < 10) score -= 0.4;
  if (item.text.length < 5) score -= 0.3;

  // Penalize generic words only
  if (/^(fix|update|change|typo|lint)$/i.test(item.text)) score -= 0.5;

  // Reward refs (indicates PR-linked change)
  if (item.refs?.length) score += 0.1;

  // Reward scope (indicates structured commit)
  if (item.scope) score += 0.1;

  return Math.max(0, Math.min(1, score));
}
```

**Output example:**
```
Bug Fixes
  [*] Fix utils import transform when workspace alias does not start with @ (#7557)
  [*] update color value detection for cssVars (#8901)

Low-quality entries (3 items grouped):
  Various small fixes: lint, sidebar, font size

Confidence: 72% (some entries had minimal descriptions)
```

**Pros:**
- Transparent about quality issues
- Preserves all information
- User understands limitations
- No external dependencies

**Cons:**
- More complex output format
- Requires UI changes in formatters

### Option 4: Grouping Terse Entries

Automatically group entries below quality threshold into a single summary line.

**Implementation:**
```typescript
const TERSE_THRESHOLD = 15;
const terseItems = items.filter(i => i.text.length < TERSE_THRESHOLD);
const qualityItems = items.filter(i => i.text.length >= TERSE_THRESHOLD);

if (terseItems.length > 0) {
  qualityItems.push({
    text: `Various small changes (${terseItems.length} items)`,
    category: 'other',
    meta: { grouped: terseItems.map(i => i.text) }
  });
}
```

**Output:**
```
Bug Fixes
  [*] Fix utils import transform (#7557)
  [*] update color value detection for cssVars (#8901)

Other Changes
  [-] Various small changes (5 items): lint, sidebar, font size, spacing, typo
```

**Pros:**
- Cleaner output
- Information preserved in metadata
- Reduces visual noise

**Cons:**
- Loss of categorization for grouped items
- May hide important small fixes

### Option 5: AI-Enhanced Descriptions

Use AI to enrich terse entries by analyzing the actual diff or PR content.

**Implementation:**
```typescript
async function enrichTerseEntry(item: ExtractedItem, repo: string): Promise<ExtractedItem> {
  if (item.text.length > 15) return item;

  // Fetch diff for the commit
  const diff = await fetchCommitDiff(repo, item.commitSha);

  // Use AI to generate description
  const enriched = await ai.complete({
    prompt: `Given this commit message "${item.text}" and diff:\n${diff}\n\nWrite a one-sentence description of what changed.`
  });

  return { ...item, text: enriched, meta: { originalText: item.text, aiEnriched: true } };
}
```

**Pros:**
- Can produce high-quality descriptions from minimal input
- Maximum information extraction

**Cons:**
- Significant cost (AI API calls + diff fetches per terse item)
- Latency increase (potentially seconds per item)
- Non-deterministic output
- Requires AI configuration
- May hallucinate incorrect descriptions
- Rate limiting concerns with many terse items

### Option 6: Commit Diff Analysis (Deterministic)

Analyze the diff to extract better descriptions without AI.

**Implementation:**
```typescript
function inferDescriptionFromDiff(diff: string, originalMessage: string): string {
  const files = extractChangedFiles(diff);
  const changes = {
    added: files.filter(f => f.status === 'added'),
    modified: files.filter(f => f.status === 'modified'),
    deleted: files.filter(f => f.status === 'deleted'),
  };

  // Build description from file changes
  if (changes.added.length && !changes.modified.length) {
    return `Add ${summarizeFiles(changes.added)}`;
  }
  // ... more heuristics
}
```

**Pros:**
- Deterministic and reproducible
- No API costs
- Can extract meaningful info from code changes

**Cons:**
- Requires fetching diffs (API calls, rate limits)
- Limited accuracy without semantic understanding
- Complex implementation
- May still produce generic descriptions

### Option 7: Source Quality Indicator

Add a prominent "Source Quality" metric to output, educating users about the limitation.

**Implementation:**
```typescript
interface SourceQuality {
  score: number;        // 0-100
  terseEntries: number; // Count of items < 15 chars
  emptyScopes: number;  // Count without scope
  missingRefs: number;  // Count without refs
}
```

**Output:**
```
vercel/ai v4.0.0 → v4.1.0
Source Quality: 45% (12 of 20 entries have minimal descriptions)

...entries...

Tip: This repository has many terse commit messages.
     Consider viewing the full commit history for details.
```

**Pros:**
- Educational for users
- Sets appropriate expectations
- No information loss
- Simple to implement

**Cons:**
- Doesn't improve the actual output
- May feel like "blaming" the source

## Analysis Matrix

| Option | Implementation | Performance | Accuracy | User Experience |
|--------|---------------|-------------|----------|-----------------|
| 1. Document | None | None | Neutral | Poor |
| 2. Filter | Simple | None | Info loss | Mixed |
| 3. Quality Score | Medium | None | Preserved | Good |
| 4. Grouping | Medium | None | Preserved | Good |
| 5. AI Enrichment | Complex | High cost | Risk of hallucination | Excellent if accurate |
| 6. Diff Analysis | Complex | API calls | Limited | Medium |
| 7. Quality Indicator | Simple | None | Preserved | Good |

## Decision Outcome

**Proposed: Combination of Options 3, 4, and 7**

1. **Quality Scoring (Option 3)**: Calculate per-item and aggregate quality scores
2. **Grouping (Option 4)**: Group terse entries into "Various small changes" with expandable detail
3. **Source Quality Indicator (Option 7)**: Surface quality metrics to users

This combination:
- Preserves all information (truthfulness)
- Improves output readability (grouping)
- Educates users about limitations (indicator)
- Has zero API cost (deterministic)
- Maintains fast performance

### Expected Consequences

**Positive:**
- Users understand when output quality is limited by input
- Cleaner output for repos with mixed quality commits
- Confidence scores become more meaningful
- No additional API costs or latency

**Negative:**
- Additional complexity in formatters
- May group legitimate short entries
- Doesn't improve the underlying information

**Neutral:**
- AI enhancement remains available as opt-in for users who want it
- Existing behavior preserved for high-quality repositories

## Implementation Phases

### Phase 1: Documentation (Immediate)

- Add "Known Limitations" section to README
- Document GIGO limitation clearly

### Phase 2: Quality Scoring

- Add `calculateItemQuality()` function to parsers
- Include quality in ExtractedItem type
- Adjust confidence calculation to account for quality

### Phase 3: Grouping and Indicator

- Implement terse entry grouping
- Add source quality metrics to output
- Update formatters to display quality indicator

### Phase 4: Future Consideration

- AI enrichment as opt-in premium feature
- User configurable quality thresholds

## More Information

- [Multi-Source Strategy](../architecture/multi-source-strategy.md)
- [Keep a Changelog](https://keepachangelog.com) - Best practices for changelogs
- [Conventional Commits](https://www.conventionalcommits.org) - Commit message standard
- Related issue: shadcn-ui/ui commit quality analysis (2025-12-07)
