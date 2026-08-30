---
"xtarterize": patch
---

Validate query --limit and --threshold inputs

Fixes silent fallback when passing invalid values like `--limit abc` (previously returned 20 results without warning) or `--threshold 5` (previously clamped to 1). Now validates inputs and exits with an error message for non-numeric, negative, or out-of-range values.
