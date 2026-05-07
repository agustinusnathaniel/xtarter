---
"xtarterize": patch
---

Batch skill installations by source repository to avoid redundant `npx` invocations. Skills from the same source (e.g. `expo/skills` with 8 skills) are now grouped into a single command with multiple `--skill` flags, reducing repo cloning from N times to 1 per unique source.
