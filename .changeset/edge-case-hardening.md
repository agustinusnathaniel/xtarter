---
"@xtarterize/core": patch
"@xtarterize/patchers": patch
"@xtarterize/tasks": patch
"xtarterize": patch
---

Edge-case hardening across CLI, core, tasks, and UI layers:

- **CLI** — try/catch guards on `init`, `sync`, `diff`, `add`, `doctor`, and `restore` prevent crashes from individual task failures; `--skip`/`--only` no longer matches phantom empty-string values; `doctor` uses `Promise.allSettled` for resilient diagnostics
- **Core** — robust atomic writes with temp file cleanup on failure; schema validation guards against corrupted cache entries; fixed React Native + React co-detection; skipped count now correctly tracks explicit skips from check phase
- **Tasks** — fixed `this.getScripts` undefined crash in `packageScriptsTask`; `commitMsgHook` accepts a package manager parameter instead of hardcoding pnpm; corrected `check()` status detection for `conflict` vs `new`
- **UI** — merged multi-diff preserves earlier diffs instead of dropping them; JSON `ok` field reflects actual conformance state; multiselect cancel properly aborts
- **Documentation** — outdated content refreshed (Node.js minimum bumped to 24, missing CLI flags documented, task applicability corrected, path fixes)
