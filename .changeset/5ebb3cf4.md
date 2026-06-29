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
- Query output redesigned with domain-bundle grouping, compact one-liners, and per-group actionable add commands
- Scoring optimized: per-token best match across synonyms eliminates dilution from low-scoring expanded terms
- Query command runs standalone without requiring project context (package.json)
- Hyphenated queries ("agent-skills") match spaced terms ("agent skills") via hyphen normalization
- Input validation hardening and edge case fixes
