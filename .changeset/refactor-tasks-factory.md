---
"@xtarterize/tasks": minor
---

Refactor tasks package with data-driven patterns

- Consolidate factory into `factory/` directory with proper module structure
- Make equivalence checks data-driven with `EquivalenceRule[]`
- Add `factory/equivalence-data.ts` for shared equivalence rules
- Add `factory/merger.ts` for merge operations
- Add `factory/package-scripts.ts` for script handling
- Add `factory/resolver.ts` for task resolution
- Refine equivalence check for scripts
- Update factory task, config, and utils
