# Future Enhancements

This document captures potential enhancements for the WNF changelog intelligence platform that are not in the current implementation scope but should be evaluated for future iterations.

---

## 1. AI-Assisted Item Scoring

**Problem**: Some changelog items are ambiguous and can't be filtered using deterministic patterns. For example, "Updates" with a lowercase 'u' might be valid in some contexts but noise in others.

**Proposed Solution**: Use an LLM to score ambiguous items on a 0-1 scale for quality/relevance.

**Implementation Approach**:
- Add `aiScore?: number` field to `ChangeItem` type
- Create `AIScoringService` that batches items for scoring
- Use a lightweight prompt like:
  ```
  Score these changelog items 0-1 for quality/relevance:
  1. "Fix memory leak in connection pool" → 0.9
  2. ":sparkle:" → 0.1
  ```
- Filter items below configurable threshold (default 0.3)

**Trade-offs**:
- (+) Catches nuanced cases that patterns miss
- (+) Improves over time with prompt tuning
- (-) Adds latency and API costs
- (-) Non-deterministic results

**Priority**: Medium - valuable for edge cases

---

## 2. Configurable Quality Thresholds

**Problem**: Different use cases have different quality tolerance. A strict internal changelog might want aggressive filtering, while a comprehensive changelog needs everything.

**Proposed Solution**: Allow users to configure filtering thresholds via API parameters or config.

**Implementation Approach**:
```typescript
interface QualityConfig {
  minScore: number;        // Default: 0.3
  minLength: number;       // Default: 10 characters
  allowMergeCommits: boolean;  // Default: false
  allowRevertCommits: boolean; // Default: true
  customPatterns: string[];    // Additional noise patterns
}
```

API usage:
```
GET /v1/repos/.../releases/latest/whats-new?minScore=0.5&allowMergeCommits=true
```

**Trade-offs**:
- (+) Flexibility for different use cases
- (+) User control over output quality
- (-) More complexity in API surface
- (-) Harder to guarantee consistent quality

**Priority**: Low - current defaults work for most cases

---

## 3. Semantic Deduplication with Embeddings

**Problem**: Current text-based deduplication only catches exact or near-exact matches. Items like "Fix auth bug" and "Fixed authentication issue" are not detected as duplicates.

**Proposed Solution**: Use text embeddings to detect semantically similar items.

**Implementation Approach**:
1. Generate embeddings for all items using a small model (e.g., `text-embedding-3-small`)
2. Compute cosine similarity between embeddings
3. Merge items above threshold (e.g., 0.85 similarity)
4. Choose the longer/more descriptive version when merging

```typescript
async function deduplicateByEmbeddings(
  items: ChangeItem[],
  threshold: number = 0.85
): Promise<ChangeItem[]>
```

**Trade-offs**:
- (+) Catches semantic duplicates that text comparison misses
- (+) More intelligent merging
- (-) Significant latency increase (embedding API calls)
- (-) Cost per item (though small models are cheap)
- (-) Overkill for most repositories

**Priority**: Low - current deduplication sufficient for most cases

---

## 4. Item Provenance Tracking

**Problem**: When items from multiple sources are merged, it's unclear which source each item came from. This makes debugging and quality assessment difficult.

**Proposed Solution**: Track the source of each item through the pipeline.

**Implementation Approach**:
```typescript
interface ChangeItem {
  text: string;
  refs?: string[];
  scope?: string;
  breaking?: boolean;
  score?: number;
  // New field
  provenance?: {
    source: 'github.release' | 'changelog.file' | 'commits' | 'ai';
    confidence: number;
    originalText?: string;  // Before normalization
  };
}
```

**Trade-offs**:
- (+) Better debugging and quality assessment
- (+) Can weight items by source reliability
- (+) Useful for compliance/audit requirements
- (-) Increases payload size
- (-) More complexity in merge logic

**Priority**: Medium - valuable for debugging and quality assessment

---

## 5. Learning from User Feedback

**Problem**: Quality filtering patterns are static and don't improve from real-world usage.

**Proposed Solution**: Collect feedback on item quality and use it to improve patterns.

**Implementation Approach**:
1. Add feedback endpoint: `POST /v1/feedback` with item ID and quality rating
2. Store feedback in database
3. Periodically analyze feedback to identify:
   - False positives (good items being filtered)
   - False negatives (noise getting through)
4. Auto-generate pattern suggestions for review

**Trade-offs**:
- (+) Continuous improvement
- (+) Adapts to repository-specific patterns
- (-) Requires user engagement
- (-) Needs infrastructure for feedback storage
- (-) Privacy considerations

**Priority**: Low - requires significant infrastructure

---

## 6. Custom Noise Patterns per Repository

**Problem**: Different repositories have different noise patterns. A gaming project might have valid commit messages like "Polish UI" while that's noise for most repos.

**Proposed Solution**: Allow repository-specific noise pattern configuration.

**Implementation Approach**:
```json
// .wnf.json in repo root
{
  "allowPatterns": [
    "^Polish\\s"
  ],
  "noisePatterns": [
    "^WIP:"
  ]
}
```

Or via API:
```
GET /v1/repos/.../releases/latest/whats-new?allowPatterns=^Polish
```

**Trade-offs**:
- (+) Adapts to repository conventions
- (+) User control over filtering
- (-) Requires repo owners to configure
- (-) More complex validation logic

**Priority**: Low - deterministic patterns work for most cases

---

## Evaluation Criteria

When considering these enhancements, evaluate:

1. **Impact**: How many users/repos would benefit?
2. **Effort**: Implementation complexity and maintenance burden
3. **Cost**: Runtime costs (API calls, compute, storage)
4. **Risk**: Could it introduce regressions or false positives?

---

*Last updated: 2025-12-05*
