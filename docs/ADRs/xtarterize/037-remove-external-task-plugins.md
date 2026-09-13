# ADR 037: Remove External Task Plugins and the Promise Task Contract

## Status

Accepted

## Date

2026-09-13

## Context

ADR 036 re-adopted Effect as the CLI orchestration layer and kept the original
Promise task contract so external, duck-typed task plugins would keep working.
That compatibility promise rested on a loader that was never exercised in
production:

- The plugin system was marked `@internal` and documented as "stable but has
  not been tested in production".
- It carried an untested surface of its own: dynamic `import()` of a
  config-supplied package name, npm specifier validation against paths and
  URLs, a 10 second load timeout, per-module export discovery (`default`,
  `tasks`, and `task`), and deduplication by task ID.
- It kept two task shapes alive (`PromiseTask` and `EffectTask`), a union type,
  and a normalization path that existed mainly for external callers.
- It had no visible consumers. The repository owner authorized removal as part
  of production-code reduction.

The change removed 211 production lines and 224 test lines. Built-in tasks are
unchanged, and CLI behavior is unchanged except that external plugin discovery
no longer happens.

## Decision

Remove external task plugin loading and the Promise task contract.

- The `plugins` key is no longer read from `.xtarterizerc`,
  `.xtarterizerc.json`, `.xtarterizerc.json5`, or the `"xtarterize"` key in
  `package.json`. The same config files still support `only` and `skip` task
  selection.
- `packages/core/src/plugins.ts` becomes `selection.ts` and exports only
  `loadSelectionConfig`, `applyTaskSelection`, and `TaskSelectionConfig`.
- `Task` is a single Effect-based interface: `check`, `dryRun`, `apply`, and
  `getDeps` return `Effect.Effect<..., TaskError, TaskServices>`. `PromiseTask`
  and `EffectTask` are gone.
- `toTaskEffect` stays. It normalizes synchronous, Promise-, and
  Effect-returning spec results at the task-factory seam and lifts plain async
  helpers; it no longer exists to support external plugins.
- The CLI session calls `getAllTasks()` from `@xtarterize/tasks` directly, and
  `getAllTasksWithPlugins` is removed.
- No dependencies change. Effect remains the orchestration layer.

## Rationale

- The system was `@internal` and untested in production, yet it was documented
  and covered by ADR 036's compatibility clauses, so it still carried the
  maintenance and review cost of a public contract.
- External loading through dynamic `import()` is a security-sensitive surface.
  Removing it removes the specifier validation and timeout machinery that
  existed only to make that surface safe.
- With no visible consumers, the compatibility promise protected nobody while
  keeping the task contract split in two.
- The selection half of the config was useful on its own (`only` and `skip`),
  so it moves to `selection.ts` unchanged.

## Alternatives Considered

1. **Keep the plugin system as-is.** Retains an untested dynamic-import path,
   the specifier and timeout code, and the union task contract, all for a
   feature with no demonstrated use.
2. **Keep plugin loading but require Effect-only plugins.** Removes the Promise
   half of the contract while keeping the dynamic-import surface and its
   validation, and it still offers a compatibility story for a plugin
   ecosystem that does not exist.
3. **Deprecate first with warnings.** Adds a release cycle, warning paths, and
   documentation while the loader keeps running. A major bump communicates the
   break more directly than warnings for a feature with no consumers.

## Consequences

### Positive

- The maintained surface shrinks by 211 production lines and 224 test lines:
  the loader, specifier validation, timeout handling, export discovery, and
  the union normalization disappear.
- The task boundary is one Effect contract, so `toTaskEffect` has a single
  purpose: normalizing first-party spec functions and plain async helpers.
- Persisted selection (`only` and `skip`) keeps working with no migration.
- No dependency or runtime changes; Effect remains the orchestration layer.

### Negative

- Breaking for any project that configured `plugins` in `.xtarterizerc` or the
  `package.json` `"xtarterize"` key; those task packages are no longer loaded.
  The release takes a major bump.
- ADR 036's plugin-compatibility clauses no longer hold, so anyone relying on
  the documented Promise contract must migrate to built-in tasks.
- A future external extension point, if one is needed, has to be designed from
  scratch.

### Related Decisions

- ADR 036 (Effect orchestration layer) - the Effect boundary stands; its task
  contract and plugin-compatibility clauses are superseded by this ADR.
- ADR 029 (task spec) - `defineTask` now returns a `DefinedTask` that is a
  plain `Task` with `getDeps`.
- ADR 023 (monorepo scope system) - scope defaults are unchanged; its
  external-plugin compatibility note is superseded.
- ADR 024 (natural-language task query) - built-in tasks still participate in
  scoring through the `Task` interface; external plugin tasks no longer exist.
