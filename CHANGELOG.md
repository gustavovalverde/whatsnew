# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial monorepo structure with Bun workspace
- `@whatsnew/types` - WNF v0.1 schema with Zod validation
- `@whatsnew/parsers` - Multi-format changelog parsers
  - Keep-a-Changelog parser
  - Conventional Commits parser
  - Changesets parser
  - GitHub Auto-Generated release notes parser
- `@whatsnew/core` - Core business logic
  - ReleaseService for fetching and aggregating releases
  - GitHubClient for GitHub API integration
  - Multi-source fallback strategy (GitHub releases → CHANGELOG.md → Commits → AI)
  - Package-first monorepo support with automatic package grouping
- `@whatsnew/api` - Hono-based HTTP API
  - REST endpoint for fetching release information
  - Package filtering via query parameter
- `@whatsnew/cli` - Command-line interface
  - Text, JSON, and Markdown output formats
  - Version range queries (by date or semver)
  - Monorepo package filtering
  - Colorized terminal output with box drawing

### Changed

- N/A

### Deprecated

- N/A

### Removed

- N/A

### Fixed

- N/A

### Security

- N/A

[Unreleased]: https://github.com/gustavovalverde/wnf/compare/v0.1.0...HEAD
