---
"@xtarterize/core": patch
"@xtarterize/tasks": patch
"xtarterize": patch
---

reduce Effect ceremony: consolidate error handling wrappers

**Problem.** Every task factory method wrapped its body in a 6-line
`Effect.runPromise(Effect.tryPromise({ try, catch }))` pattern, duplicated
21 times across 4 files. The `tryEffect` helper was also copy-pasted between
`diagnostics.ts` and `preflight.ts`, with the `readPackageJson` null-guard
pattern repeated 5 times across check functions.

**What changed (6 files, +550/-751):**

- `packages/tasks/src/factory/ops.ts` — added `wrapTask(taskId, method, fn)`
  internal helper that collapses the Effect wrapper into 1 line using a plain
  Promise catch
- `packages/tasks/src/factory/index.ts` — replaced 15 Effect wrappers with
  `wrapTask`, removed `Effect` import
- `packages/tasks/src/factory/task.ts` — replaced 3 wrappers, removed `Effect`
  and `TaskError` imports
- `packages/tasks/src/agent/skills-install.ts` — replaced 3 wrappers, removed
  `Effect` import, fixed hardcoded task IDs in error metadata
- `packages/core/src/diagnostics.ts` — exported `tryEffect` and added
  `tryReadPackageJson(cwd)` helper, replaced 4 null-guard copies
- `packages/core/src/preflight.ts` — removed duplicate `tryEffect`, imports
  shared version from diagnostics, dropped `FileSystemError` import

**No behavior change.** Error wrapping semantics are identical. All 323 tests
pass unchanged. The `Effect` import is removed from 3 task files where it
was only used for the wrapper pattern.
