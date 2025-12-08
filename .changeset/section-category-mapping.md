---
"@whatsnew/parsers": patch
"@whatsnew/utils": patch
---

Improve section-based categorization for generic format

- Add shared `SECTION_TO_CATEGORY_MAP` with 30+ section name variations
- Add `mapSectionToCategory()` helper for consistent section→category mapping
- Update generic extractor to use section mapping instead of hardcoded "other"
- Update github-auto extractor to use shared mapping (removes duplication)
- Improve `normalizeForDeduplication()` to strip `#1234-` prefixes, author attributions, and `(closes #1234)` patterns

Fixes issues with repos like 47ng/nuqs where items in "Bug fixes" sections were incorrectly categorized as "other".
