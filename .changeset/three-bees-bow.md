---
"@xtarterize/core": patch
"@xtarterize/tasks": patch
"xtarterize": patch
---

adopt Effect TS v4 for internal error handling and workflow composition

**Why Effect v4.**

The project's async workflows had ad-hoc error handling — `try/catch` with
`new Error(String(cause))` that lost error type context, couldn't distinguish
error kinds at the type level, and made it impossible to pattern-match on
failures. Effect v4 provides `Data.TaggedError` (discriminated unions that
extend `Error`), `Effect.tryPromise` (typed promise wrapping), `Effect.gen`
(ergonomic generator-based composition), and `Effect.all` (structured
concurrency with error aggregation).

**Approach: boundary pattern, not full migration.**

Rather than making every function return `Effect<A, E>` (which would require
all callers to understand Effect), we apply Effect at two levels:

1. **Internal composition** — async workflows use `Effect.gen` + `yield*`,
   `Effect.all` for concurrency, and `Effect.tryPromise` with typed error
   handlers. This gives us structured error handling without changing
   how consumers call the library.
2. **Promise boundary** — all public API signatures remain `Promise<T>`.
   `Effect.runPromise` unwraps at the function boundary. Tests require zero
   changes.

**What changed (26 files, +1857/-1571):**

Tagged errors and Effect composition:
- `packages/core/src/errors.ts` (new) — consolidated `Data.TaggedError`
  types: `FileSystemError` (read/write/parse failures), `BackupError`
  (backup operations), `TaskError` (task check/apply failures)
- `packages/core/src/utils/fs.ts` — every FS operation wraps with
  `Effect.tryPromise` catching as `FileSystemError` instead of generic
  `new Error(String(cause))`
- `packages/core/src/backup.ts` — backup workflow uses `Effect.gen` for
  sequential steps (access → mkdir → cp → read/write index) with
  `BackupError` typing and atomic index writes
- `packages/core/src/diagnostics.ts` — parallel checks via `Effect.all`,
  tool execution with `FileSystemError`, all `tryEffect` helpers upgraded
  to tagged errors; exported `tryReadPackageJson` to eliminate 4 copies
  of the null-guard pattern
- `packages/core/src/preflight.ts` — validation orchestration via
  `Effect.gen` with `FileSystemError`; deduplicated `tryEffect` by
  importing from diagnostics
- `packages/core/src/resolve.ts` — concurrent task status checks via
  `Effect.all`
- `packages/core/src/apply.ts` — per-task error handling with `TaskError`,
  same-name tasks continue after failures
- `packages/core/src/utils/deep-equal.ts` — custom recursion replaced
  with `Equal.equals` from Effect

Reducing Effect ceremony:
- `packages/tasks/src/factory/ops.ts` — added `wrapTask(taskId, method, fn)`
  internal helper collapsing the 6-line `Effect.runPromise(Effect.tryPromise)`
  pattern into 1 line
- `packages/tasks/src/factory/index.ts` — replaced 15 Effect wrappers,
  removed `Effect` import
- `packages/tasks/src/factory/task.ts` — replaced 3 wrappers, removed
  `Effect` and `TaskError` imports
- `packages/tasks/src/agent/skills-install.ts` — replaced 3 wrappers,
  removed `Effect` import, fixed hardcoded task IDs in error metadata

**Trade-offs.**

- Added Effect v4 beta as a dependency (~44 MB install size, 10 transitive
  deps). Beta stability risk is mitigated by pinning the exact version in
  `pnpm-workspace.yaml` catalog.
- The initial adoption introduced `Effect.tryPromise` ceremony at every
  call site; subsequent consolidation via `wrapTask` collapsed 21 such
  wrappers into a single 8-line helper, removing the `Effect` import from
  all task factory files.

**Verification.**

All 323 existing tests pass unchanged. `Effect.runPromise` at each function
boundary ensures the Promise-based public API is preserved.
