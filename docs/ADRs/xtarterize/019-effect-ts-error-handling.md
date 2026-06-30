# ADR 019: Effect TS v4 for Internal Error Handling and Workflow Composition

## Status

Accepted

## Date

2026-05-21

## Context

The xtarterize codebase had ad-hoc error handling scattered across all async
operations. The dominant pattern was `new Error(String(cause))` inside
`try/catch` blocks, which:

1. **Lost error type context** - `String(cause)` erased whatever structured
   error the operation produced
2. **Prevented error discrimination** - consumers couldn't pattern-match on
   error kinds; every error was just `Error`
3. **Mixed concerns** - application errors (file not found), system errors
   (permissions), and unexpected defects (bugs in dependencies) were all
   treated identically
4. **No structured concurrency** - parallel operations used `Promise.all`
   which provides no way to aggregate or transform error types from
   heterogeneous operations

The decision to adopt Effect TS v4 was initiated in the project setup
(already listed in `pnpm-workspace.yaml` catalog at `4.0.0-beta.70` before
any code was written), but the migration proceeded incrementally.

## Decision

We adopt Effect TS v4 for internal async operations using a **boundary
pattern**:

### 1. Boundary Rule

- **Internally**: async functions compose with `Effect.tryPromise`,
  `Effect.gen`, `Effect.all`, and typed error handlers
- **Public API**: all exported functions return `Promise<T>`.
  `Effect.runPromise` unwraps at the function boundary
- **Tests**: run against the Promise API. No Effect knowledge required.

This gives us Effect's type-safe error handling without forcing every
consumer (internal packages, tests, CLI commands) to learn Effect.

### 2. Error Types

Three consolidated `Data.TaggedError` classes:

- `FileSystemError` - file read/write/parse/copy failures
- `BackupError` - backup operation failures (distinct from FS because
  backup is a separate domain concern with its own recovery semantics)
- `TaskError` - task check/dryRun/apply failures

These replace the previous pattern where every error was `new Error(String(cause))`
with no type-level distinction.

### 3. Composition Patterns

- **Sequential workflows**: `Effect.gen` with `yield*` (backup steps,
  preflight validation, environment checks)
- **Concurrent workflows**: `Effect.all` with heterogeneous effect lists
  (parallel file detection, concurrent task status checks)
- **Error recovery**: `Effect.orElseSucceed` for fallback values,
  `Effect.catchCause` for logging without aborting
- **Deep equality**: `Equal.equals` from Effect replaces a custom
  recursive `deepEqual` implementation

### 4. Scope

Affected packages and their approach:

| Package         | Files   | Approach                                     |
| --------------- | ------- | -------------------------------------------- |
| `core/src/`     | 8 files | Full boundary pattern with tagged errors     |
| `tasks/src/`    | 3 files | `Effect.tryPromise` boundaries + `TaskError` |
| `patchers/src/` | 0 files | Pure functions, no async - no Effect needed  |
| CLI apps        | 0 files | Already at the Promise boundary - no change  |

## Consequences

### Positive

- ✅ **Type-safe error handling** - every catch handler produces a
  `Data.TaggedError` that can be discriminated by tag
- ✅ **Structured concurrency** - `Effect.all` aggregates errors from
  parallel operations; one failure doesn't silently swallow others
- ✅ **Preserved test compatibility** - all 323 existing tests pass
  without changes
- ✅ **Incremental adoption** - the boundary pattern means packages that
  don't import Effect yet (patchers, CLI) can remain untouched
- ✅ **Reduced boilerplate** - `Equal.equals` replaces 200 lines of
  custom recursive `deepEqual` with a single import

### Negative

- ⚠️ Added Effect v4 beta as a runtime dependency (~44 MB install size,
  10 transitive deps). Pinned to exact version in catalog to control
  beta drift risk.
- ⚠️ Internal code now has `Effect.tryPromise({ try, catch })` wrapping
  around every async operation, adding ~3 lines of ceremony per call
  site
- ⚠️ Generators (`function*`) for `Effect.gen` are unfamiliar to some
  developers; the asterisk and `yield*` syntax has subtle rules

### Future considerations

- Move to full Effect model (Task interface returns `Effect`, not
  `Promise`) if the project grows enough to justify it
- Add `Effect.fn("name")` for automatic tracing and named stack traces
  if debugging complexity increases
- Consider `Context.Service` for FileSystem/Logger DI if test
  requirements demand mock filesystem support
