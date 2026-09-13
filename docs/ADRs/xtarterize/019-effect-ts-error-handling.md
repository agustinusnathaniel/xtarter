# ADR 019: Effect TS v4 for Internal Error Handling and Workflow Composition

## Status

Superseded

Superseded by [ADR 035](035-effect-removal-async-await.md), which [ADR 036](036-effect-orchestration-layer.md) in turn supersedes. ADR 036 re-adopts Effect as the CLI orchestration layer without restoring this ADR's Promise boundary or `Equal.equals`.

## Date

2026-05-21

## Context

The codebase had ad-hoc error handling scattered across all async operations:
the dominant `new Error(String(cause))` inside `try/catch` erased structured
errors, prevented discrimination by kind, conflated application errors (file
not found), system errors (permissions), and unexpected defects, and left
parallel operations on `Promise.all` with no way to aggregate error types.

The decision to adopt Effect TS v4 was initiated in the project setup (already
listed in `pnpm-workspace.yaml` catalog at `4.0.0-beta.70` before any code was
written), but the migration proceeded incrementally.

## Decision

We adopt Effect TS v4 for internal async operations using a **boundary
pattern**:

### 1. Boundary Rule

- **Internally**: async functions compose with `Effect.tryPromise`,
  `Effect.gen`, `Effect.all`, and typed error handlers.
- **Public API**: all exported functions return `Promise<T>`;
  `Effect.runPromise` unwraps at the function boundary.
- **Tests**: run against the Promise API. No Effect knowledge required.
  The point is type-safe error handling without forcing every consumer
  (internal packages, tests, CLI commands) to learn Effect.

### 2. Error Types

Three consolidated `Data.TaggedError` classes replaced untyped
`new Error(String(cause))`:

- `FileSystemError` - file read/write/parse/copy failures
- `BackupError` - backup failures (a separate domain concern with its own
  recovery semantics)
- `TaskError` - task check/dryRun/apply failures

### 3. Composition Patterns

- **Sequential workflows**: `Effect.gen` with `yield*` (backup steps,
  preflight validation, environment checks)
- **Concurrent workflows**: `Effect.all` with heterogeneous effect lists
  (parallel file detection, concurrent task status checks)
- **Error recovery**: `Effect.orElseSucceed` for fallback values,
  `Effect.catchCause` for logging without aborting
- **Deep equality**: `Equal.equals` replaces a custom recursive `deepEqual`

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

- **Type-safe error handling** - every catch handler produces a
  `Data.TaggedError` discriminable by tag.
- **Structured concurrency** - `Effect.all` aggregates errors from parallel
  operations instead of silently swallowing them.
- **Preserved test compatibility** - all 323 existing tests passed unchanged.
- **Incremental adoption** - packages that didn't import Effect (patchers,
  CLI) stayed untouched.
- **Reduced boilerplate** - `Equal.equals` replaced 200 lines of custom
  recursive `deepEqual` with a single import.

### Negative

- Added Effect v4 beta as a runtime dependency (~44 MB install size, 10
  transitive deps), pinned to an exact version in the catalog to control beta
  drift risk.
- Every async operation gained `Effect.tryPromise({ try, catch })` wrapping,
  about 3 lines of ceremony per call site.
- `Effect.gen` generators (`function*`, `yield*`) have subtle rules and were
  unfamiliar to some developers.

### Future considerations

- Move to a full Effect model (Task interface returns `Effect`, not `Promise`)
  if the project grows enough to justify it.
- Add `Effect.fn("name")` for automatic tracing and named stack traces if
  debugging complexity increases.
- Consider `Context.Service` for FileSystem/Logger DI if test requirements
  demand mock filesystem support.
