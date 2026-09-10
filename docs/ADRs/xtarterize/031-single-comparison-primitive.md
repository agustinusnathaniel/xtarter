# ADR 031: Single Deep-Equality Primitive

## Status

Accepted

## Date

2026-09-10

## Context

Three comparison strategies exist:

1. `packages/core/src/utils/deep-equal.ts` exports `deepEqual`, a wrapper
   around `Equal.equals` from Effect, re-exported through the task factory and
   used by `json-config`, `ts/strict`, `deps/renovate`, and `lint/oxlint`.
2. `packages/patchers/src/json-merge.ts` has a private recursive `deepEqual`
   used to decide whether a merge produces a real change.
3. `packages/tasks/src/factory/file-task.ts` compares serialized JSON with
   `JSON.stringify(actualJson) === JSON.stringify(merged)`.

The strategies do not always agree (Effect.Equal carries its own structural
semantics), and the patcher duplicates equality logic that core already
exports.

## Decision

`node:util.isDeepStrictEqual` is the only deep-equality primitive.

- Delete `packages/core/src/utils/deep-equal.ts` and the `deepEqual` export
  from `packages/core/src/index.ts` and the task factory.
- Delete the private `deepEqual` in `packages/patchers/src/json-merge.ts`.
- Replace the `JSON.stringify` comparison in `file-task.ts`.
- Update importers (`json-config`, `ts/strict`, `deps/renovate`, `lint/oxlint`,
  json-merge) to call `isDeepStrictEqual`.

## Rationale

- No new dependency: Node provides the primitive.
- One semantics for change detection across core, patchers, and tasks.
- Fewer modules and no Effect-specific equality on a public path, consistent
  with ADR 019 (Effect stays internal).
- `isDeepStrictEqual` matches the JSON-compatible values the task engine
  compares.

## Alternatives Considered

- **Keep the wrappers.** Three semantics that can drift; the patcher cannot
  import core, so it would keep a private copy.
- **Adopt `fast-deep-equal`.** A dependency for behavior Node already ships.
- **Per-call comparison.** Repeats the current inconsistency.
- **Keep the Effect.Equal wrapper and export it everywhere.** Keeps Effect on
  the public API (ADR 019) and keeps serialized and recursive variants alive.

## Consequences

### Positive

- One comparison primitive; patcher and core can share it without cycles.
- No new dependency; one fewer module.
- Serialized `JSON.stringify` comparison (key-order dependent) is gone.

### Negative

- Edge semantics change for values the wrappers treated differently (for
  example `undefined` properties versus missing keys); the existing patcher,
  task, and core suites cover the compared shapes and are the regression net.

### Related Decisions

- ADR 010 (surgical JSON patching), ADR 019 (Effect TS error handling),
  Plan 043 Step 3.3.
