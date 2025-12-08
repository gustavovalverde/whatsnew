---
"@whatsnew/parsers": patch
"@whatsnew/utils": patch
"@whatsnew/types": patch
"@whatsnew/core": patch
---

Fix section-based categorization and tag preservation

**Categorization improvements:**
- Add section_hint tier that takes precedence over keyword matching
- Fix items in "Documentation" sections being miscategorized as "fixes"
- Enhanced `stripTrailingRefs()` to remove inline markdown ref links

**Tag and URL fixes:**
- Preserve original tag from GitHub API (e.g., `v3.1.0` instead of `3.1.0`)
- Use GitHub's actual release URL instead of constructing it
- Fixes display and link issues for repos with non-standard tag formats

Tested against 47ng/nuqs and zcashfoundation/zebra.
