---
"@xtarterize/core": minor
"@xtarterize/patchers": minor
"@xtarterize/tasks": minor
"xtarterize": minor
---

feat: add natural language task query engine with `query` command and `init --compose`

New features:
- `xtarterize query <query>` — search and discover tasks using natural language with a pure-algorithmic scoring engine
- `xtarterize init --compose <query>` — compose a targeted task plan by ranking tasks by relevance
- Task metadata enrichment: new optional `searchMeta` field on the Task interface with `tags`, `configTargets`, and `keywords` supports richer search results
- All 26 built-in tasks now include search metadata
