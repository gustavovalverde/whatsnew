---
status: proposed
date: 2025-12-08
story: Social sharing shows generic preview instead of repo-specific information
---

# Dynamic Open Graph Metadata for Shareable URLs

## Context and Problem Statement

The web app generates shareable URLs via query parameters (e.g., `whatsnew.sh?repos=vercel/ai&since=2024-01-01`). When these links are shared on social platforms, the Open Graph preview displays generic metadata ("What's New - Changelog Intelligence") rather than repo-specific information ("Changelog for vercel/ai").

This reduces the value of social sharing—users cannot immediately see which repository the link refers to from the preview card.

## Current State

### What Works Well

- Static OG image (`og-image.png`, 1200x630px)
- Twitter card configuration (summary_large_image)
- Complete favicon and PWA icon set
- `metadataBase` properly configured
- Shareable URL state via `nuqs` (repos, since, until, package, unreleased)
- Auto-generation when URL contains repos parameter

### The Data Availability Challenge

Unlike traditional multi-page apps, our SPA has a timing problem:

| Scenario | Data Available? | OG Preview |
|----------|-----------------|------------|
| User generates changelog, copies URL, shares | Yes (cached) | Could show repo info |
| User crafts URL manually, shares immediately | No | Must fetch or show generic |
| Crawler hits shared URL | Maybe cached | Depends on prior generation |

The core challenge: **OG metadata is read by crawlers before JavaScript executes**. The changelog data may not exist until someone triggers generation.

## Priorities and Constraints

- Must work with Next.js App Router metadata APIs
- Should not add significant latency to crawler requests
- Should gracefully handle URLs where data doesn't exist yet
- Minimal complexity—this is a single-page app
- No need for dynamic OG images initially (text metadata is sufficient)

## Considered Options

### Option 1: Static Metadata (Current State)

Keep generic OG tags for all URLs.

**Pros:**
- Zero complexity
- No additional server load
- Consistent preview appearance

**Cons:**
- Shared links lack context
- Users can't tell which repo a link refers to from preview

### Option 2: Dynamic Text Metadata via `generateMetadata()`

Use Next.js `generateMetadata()` to read `searchParams` and generate repo-specific title/description.

```typescript
// app/page.tsx
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const repos = searchParams.repos?.split(',').filter(Boolean) || [];

  if (repos.length === 0) {
    return defaultMetadata;
  }

  const repoList = repos.slice(0, 3).join(', ');
  const suffix = repos.length > 3 ? ` +${repos.length - 3} more` : '';

  return {
    title: `Changelog for ${repoList}${suffix} - What's New`,
    description: `See what's changed in ${repoList}${suffix}. Generated semantic changelog with categorized changes.`,
    openGraph: {
      title: `Changelog for ${repoList}${suffix}`,
      description: `See what's changed in ${repoList}${suffix}`,
      // Keep static image for now
      images: ['/og-image.png'],
    },
  };
}
```

**Pros:**
- Repo names visible in preview without fetching changelog data
- No API calls needed—just reads URL params
- Fast, no latency impact
- Works even for manually crafted URLs

**Cons:**
- Cannot show actual changelog content (version, date, change count)
- Static image doesn't reflect repo

### Option 3: On-Demand Data Fetch for Metadata

Fetch actual changelog data during `generateMetadata()` to include version/date info.

```typescript
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const repos = searchParams.repos?.split(',').filter(Boolean) || [];

  if (repos.length === 0) return defaultMetadata;

  // Fetch first repo's data for richer metadata
  const [owner, repo] = repos[0].split('/');
  try {
    const data = await getCachedLatestRelease(owner, repo);
    return {
      title: `${repo} ${data.version} - What's New`,
      description: `${data.categories.length} categories of changes in ${owner}/${repo} ${data.version}`,
      // ...
    };
  } catch {
    // Fallback to param-based metadata
    return generateParamBasedMetadata(repos);
  }
}
```

**Pros:**
- Rich, accurate metadata (version, date, change summary)
- Uses existing cache (1-hour TTL)
- Graceful fallback

**Cons:**
- API call on every crawler request (even if cached)
- Latency for uncached repos
- More complex error handling
- Rate limit considerations for popular repos

### Option 4: Dynamic OG Image Generation

Use Next.js `opengraph-image.tsx` to generate images with repo names/branding.

```typescript
// app/opengraph-image.tsx
import { ImageResponse } from 'next/og';

export default async function Image({ searchParams }: Props) {
  const repos = searchParams.repos?.split(',') || [];

  return new ImageResponse(
    <div style={{ /* branded layout */ }}>
      <h1>What's New</h1>
      <p>{repos.join(', ')}</p>
    </div>,
    { width: 1200, height: 630 }
  );
}
```

**Pros:**
- Visually distinctive per-repo previews
- High social sharing impact

**Cons:**
- Image generation adds latency (~100-500ms)
- More complex styling/maintenance
- Edge runtime requirements
- Overkill for initial release

### Option 5: Hybrid Approach (Recommended)

Combine Options 2 and 3 with smart fallback:

1. **Always**: Generate title/description from URL params (instant, no API)
2. **If cached**: Enrich with version/date from cached data (no latency)
3. **If not cached**: Use param-based metadata only (no blocking fetch)

```typescript
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const repos = searchParams.repos?.split(',').filter(Boolean) || [];

  if (repos.length === 0) return defaultMetadata;

  // Base metadata from params (always available)
  const repoList = repos.slice(0, 3).join(', ');
  let title = `Changelog for ${repoList}`;
  let description = `See what's changed in ${repoList}`;

  // Try to enrich from cache (non-blocking check)
  const [owner, repo] = repos[0].split('/');
  const cached = await checkCache(owner, repo); // Fast cache lookup only

  if (cached) {
    title = `${repo} ${cached.version} - What's New`;
    description = `${cached.releaseDate}: ${cached.totalChanges} changes in ${owner}/${repo}`;
  }

  return {
    title,
    description,
    openGraph: { title, description, images: ['/og-image.png'] },
    twitter: { card: 'summary_large_image', title, description },
  };
}
```

**Pros:**
- Fast path for uncached URLs (param-based)
- Rich metadata when cache available
- No blocking API calls
- Progressive enhancement

**Cons:**
- Cache-check logic adds complexity
- Inconsistent metadata richness

## Decision Outcome

**Proposed: Option 2 (Dynamic Text Metadata) as initial implementation**

Start with the simplest solution that provides value: generate title/description from URL parameters without any API calls.

This addresses the primary pain point (generic previews for shared links) with minimal complexity. The metadata will always show which repos the link refers to, even for manually crafted URLs.

**Future enhancement path:**
1. **Phase 1**: Implement Option 2 (param-based metadata)
2. **Phase 2**: Add cache enrichment (Option 5) if metrics show value
3. **Phase 3**: Consider dynamic OG images (Option 4) based on social sharing analytics

### Expected Consequences

**Positive:**
- Shared links immediately show repo names in preview
- No API latency impact
- Works for all URL variations (manually crafted or generated)
- Simple implementation (~30 lines)

**Negative:**
- Cannot show version/date without data fetch
- Static OG image doesn't differentiate repos visually

**Neutral:**
- Requires converting page.tsx to use async generateMetadata
- May want to add structured data (JSON-LD) in same pass

## Implementation Notes

### Required Changes

1. Convert `app/page.tsx` to export async `generateMetadata()`
2. Move static metadata from `layout.tsx` to `page.tsx` (for param access)
3. Keep layout.tsx metadata as fallback for base URL

### Structured Data Consideration

While implementing dynamic metadata, consider adding JSON-LD for WebApplication:

```typescript
// In generateMetadata or via <script type="application/ld+json">
const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'What\'s New',
  url: 'https://whatsnew.sh',
  applicationCategory: 'DeveloperApplication',
  description: 'Generate semantic changelogs for GitHub repositories',
};
```

This is orthogonal to the OG metadata decision but could be bundled in the same implementation.

### robots.txt

Should also add basic robots.txt:

```
User-agent: *
Allow: /
```

## More Information

- [Next.js Metadata API](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)
- [Open Graph Protocol](https://ogp.me/)
- [Twitter Cards](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)
- Current metadata: `apps/web/src/app/layout.tsx:17-51`
- URL state management: `apps/web/src/app/page-client.tsx:109-122` (nuqs)
