---
"xtarterize": minor
"@xtarterize/core": minor
"@xtarterize/tasks": minor
"create-xtarter-app": patch
---

Enforce file and function size limits via Biome and Oxlint

Adds 500-line file and 60-line function limits to generated configs. Biome uses skipBlankLines (skipComments unsupported in 2.5.9) while Oxlint uses both skipBlankLines and skipComments. Test files disable function limit. Refactors core apply pipeline, task factories, and CLI commands to comply with new limits.
