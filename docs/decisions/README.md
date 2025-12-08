# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for the whatsnew project.

## What is an ADR?

An Architecture Decision Record is a document that captures an important architectural decision made along with its context and consequences.

## Creating a New ADR

```bash
cp template.md NNN-title-with-dashes.md
```

Use the next available number in sequence.

## Index

| ADR | Status | Title |
|-----|--------|-------|
| [001](./001-input-quality-limitations.md) | proposed | Input Quality Limitations and Mitigation Strategies |
| [002](./002-version-tag-commit-filtering.md) | proposed | Filter Version Tag Commits from Commit History |
| [003](./003-dynamic-open-graph-metadata.md) | proposed | Dynamic Open Graph Metadata for Shareable URLs |

## Issue Categories

### Terse Developer Commits (ADR-001)
- **Affected repos**: shadcn-ui/ui, some smaller projects
- **Root cause**: Developers using minimal commit messages ("fix", "lint", "typo")
- **Impact**: Low information value in changelog entries
- **Solution**: Quality scoring + confidence penalty + user warning

### Version Tag Commits (ADR-002)
- **Affected repos**: vitejs/vite, vercel/ai, repos with frequent releases
- **Root cause**: Release automation creates version-only commits
- **Impact**: Output pollution with "v1.2.3" entries, inflated terse ratio
- **Solution**: Filter version patterns at fetch time

### Dynamic Open Graph Metadata (ADR-003)
- **Affected feature**: Social sharing of generated changelog URLs
- **Root cause**: Static OG metadata doesn't reflect URL query params
- **Impact**: Shared links show generic "What's New" instead of repo-specific preview
- **Solution**: Use `generateMetadata()` to create repo-specific title/description from URL params
