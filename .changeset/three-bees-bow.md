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

**What changed (20 files, +1307/-820):**

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
  to tagged errors
- `packages/core/src/preflight.ts` — validation orchestration via
  `Effect.gen` with `FileSystemError`
- `packages/core/src/resolve.ts` — concurrent task status checks via
  `Effect.all`
- `packages/core/src/apply.ts` — per-task error handling with `TaskError`,
  same-name tasks continue after failures
- `packages/core/src/utils/deep-equal.ts` — custom recursion replaced
  with `Equal.equals` from Effect
- `packages/tasks/src/factory/index.ts` — all 17 catch/throw handlers in
  5 factory methods use `TaskError`
- `packages/tasks/src/factory/task.ts` — 3 catch handlers use `TaskError`
- `packages/tasks/src/agent/skills-install.ts` — 4 catch/throw use `TaskError`

**Trade-offs.**

- Added Effect v4 beta as a dependency (~44 MB install size, 10 transitive
  deps). Beta stability risk is mitigated by pinning the exact version in
  `pnpm-workspace.yaml` catalog.
- Internal Effect usage adds import boilerplate (`import { Effect } from
  'effect'`) at call sites — acceptable because the alternative was ad-hoc
  error handling that was harder to reason about.

**Verification.**

All 323 existing tests pass unchanged. `Effect.runPromise` at each function
boundary ensures the Promise-based public API is preserved.
