---
"@whatsnew/cli": minor
---

Add global configuration management for persistent settings

**New Features:**
- `whatsnew config set <key> <value>` - Save settings to config file
- `whatsnew config list` - View current configuration with source labels
- `whatsnew config path` - Show config file location
- `whatsnew config unset <key>` - Remove a setting

**Configuration Priority:**
1. CLI flags (`--github-token`, `--ai-key`)
2. Environment variables (`GITHUB_TOKEN`, `ANTHROPIC_API_KEY`, etc.)
3. Config file (`~/.config/whatsnew/config.json`)

**Security:**
- XDG-compliant config directory
- Secure file permissions (0600 for files, 0700 for directories)
- Token validation on set with `--skip-validation` escape hatch
- Tokens are masked in `config list` output

**Supported Keys:**
- `github_token` - GitHub personal access token
- `ai.api_key` - AI provider API key (auto-detects Anthropic/OpenAI)
- `ai.provider` - AI provider selection (anthropic or openai)
