---
"@xtarterize/core": patch
---

refactor: add fingerprint-based caching to detectProject

Wraps detectProject with a best-effort cache keyed on project state
fingerprints. Cache hit <1ms vs ~50-150ms for full detection.
