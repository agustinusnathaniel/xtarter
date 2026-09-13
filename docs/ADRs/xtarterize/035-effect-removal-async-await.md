# ADR 035: Remove Effect TS in Favor of Plain Async/Await with Bounded Concurrency

## Status

Superseded by [ADR 036](036-effect-orchestration-layer.md).

Update (2026-09-13): ADR 036 re-adopted Effect; ADR 037 later removed the Promise task contract and plugin loading. The body below records the state at the time of this decision.

## Date

2026-09-11

## Context

ADR 019 adopted Effect TS v4 for internal async operations behind a Promise
boundary: `Effect.tryPromise`, `Effect.gen`, `Effect.all`,
`Effect.orElseSucceed`, `Data.TaggedError` classes, and `Equal.equals`. The
rationale was typed error handling and structured concurrency without exposing
Effect to consumers, and the cost was accepted as a beta runtime dependency
with per-call ceremony.

By the production-reduction round the remaining uses had narrowed to:

- three error classes (`FileSystemError`, `BackupError`, `TaskError`)
- bounded parallel task checks and dry-runs (previously `Effect.all`)
- a small number of `Effect.tryPromise` wrappers with fallback values

ADR 031 had already removed the `Equal.equals` deep-equality wrapper. Most
call sites wrapped a single async operation only to unwrap it at the same
function boundary, so the typed-error benefit was not realized.

## Decision

Remove Effect from `@xtarterize/core` and use plain async/await with a small
local concurrency helper.

- `packages/core/src/errors.ts` keeps `FileSystemError`, `BackupError`, and
  `TaskError` as plain `Error` subclasses with the same fields (`path`,
  `cause`, `taskId`) and `name` values.
- `packages/core/src/resolve.ts` exports `CONCURRENCY = 8` and
  `mapWithConcurrency(items, limit, fn)`, which keeps at most `limit`
  callbacks in flight and returns results in input order.
- Task status checks (`collectTaskChecks`) and apply dry-runs
  (`planTasks`) use `mapWithConcurrency` instead of `Effect.all`.
- Fallback reads use `try/catch` that returns the fallback value directly.
- `effect` is removed from the `@xtarterize/core` dependencies.

## Rationale

- The public API was always `Promise<T>`; Effect was an internal encoding that
  most call sites unwrapped immediately.
- `mapWithConcurrency` is a small local helper with no dependency and covers
  the only structured-concurrency need: a bounded parallel map that preserves
  order.
- The error classes stay distinguishable through `instanceof` and `name`; no
  consumer depended on Effect tags.
- Removing the beta dependency removes install size and the beta-drift risk
  noted in ADR 019.

## Alternatives Considered

1. **Keep Effect.** The typed-error benefit did not materialize at call sites
   that only rethrew; the dependency and ceremony cost remained.
2. **Adopt `p-limit` or `p-map` for concurrency.** A dependency for a small,
   well-understood loop; the local helper is smaller than the adoption cost.
3. **Keep Effect only for error classes.** `Data.TaggedError` was the main
   value, but `instanceof` and `name` already discriminate the three classes,
   and keeping the runtime for them alone is not justified.

## Consequences

### Positive

- Fewer dependencies and less ceremony per async call.
- Error types remain distinguishable through `instanceof` and `name`.
- The concurrency limit (8) is explicit and exercised by the task suites.

### Negative

- `mapWithConcurrency` propagates a rejected callback to the caller. Per-task
  check and dry-run callbacks already capture their own errors, so their
  non-fatal behavior is unchanged; a rejected `getDeps` call still fails the
  plan, as before.

### Related Decisions

- ADR 019 (Effect TS error handling) - superseded by this ADR.
- ADR 031 (single deep-equality primitive) - removed the Effect equality
  wrapper first.
- ADR 021 (fingerprint profile caching) - its Effect-based cache I/O was
  removed with the cache (ADR 034).
