# ADR 036: Effect Orchestration Layer for CLI Command Programs

## Status

Accepted

## Date

2026-09-12

## Context

ADR 019 adopted Effect TS v4 behind a Promise boundary. ADR 035 removed it
because the typed-error benefit did not survive call sites that wrapped a
single operation only to unwrap it at the same function boundary, and
`mapWithConcurrency` covered the only structured-concurrency need.

The command lifecycle then accumulated concerns that plain async/await handles
poorly:

- Cancellation had to be threaded by hand through every await.
- Resource lifecycles (the apply spinner, the dependency install) had no
  structured release.
- Per-task check and dry-run isolation duplicated exit-style handling at each
  seam.
- Plugin loading used `Promise.race` plus `setTimeout` for a 10s timeout.
- The raw config read used a hand-rolled Promise cache map.
- Prompts lived in a process-global `activePrompter` / `setPrompter` /
  `getPrompter` singleton, which made test isolation awkward.

This refactor re-adopts Effect v4 RC as an orchestration layer for CLI command
programs: one Effect program per command, one runtime edge, services for the
effectful edges, and a Promise-compatible task contract. It does not restore
ADR 019's boundary pattern (Effect internal, Promise public) and it does not
restore `Equal.equals` (ADR 031 keeps `isDeepStrictEqual`).

## Decision

### Boundary model

- **Packages return Effects.** Code in `packages/*/src` constructs and composes
  `Effect.Effect` values. It must not call `Effect.runPromise`,
  `Effect.runPromiseExit`, or build a `ManagedRuntime`.
- **One runtime edge.** [`apps/xtarterize/src/runtime.ts`](../../../apps/xtarterize/src/runtime.ts)
  exports `runCliProgram`, which provides `AppLayer` and runs one command
  program with `Effect.runPromiseExit`, forwarding an `AbortSignal`. `Exit` and
  `Cause` rendering happens exactly once: a `Cause.findErrorOption` or
  `findDefect` message goes through `logError`; interrupt-only causes set exit
  code 0; other failures set exit code 1 and the program resolves to
  `undefined`.
- **Every command uses the edge.** All ten commands (`init`, `sync`, `check`,
  `diff`, `add`, `list`, `query`, `doctor`, `undo`, `restore`) call
  `runCliProgram` with their command program.
- **Apps own the only runtime.** `apps/create-xtarter-app` stays Promise-based
  and calls no Effect runtime either.
- **Non-Effect consumers use the plain entry.** `@xtarterize/core/plain`
  ([`packages/core/src/plain.ts`](../../../packages/core/src/plain.ts))
  re-exports only leaf helpers whose import graph never reaches `effect`
  (`cli-args`, `invocation-guard`, `logger`, `prompts`, and `fileExists`).
  `apps/create-xtarter-app` imports that subpath exclusively.
- The rule is enforced by `scripts/check-effect-boundaries.mjs`, which runs in
  `pnpm check` and `pnpm check:ci` through `verify:effect-boundaries`. The
  script scans `packages/*/src/**/*.ts` and fails with `file:line` output on
  `runPromise`, `runPromiseExit`, `runSync`, or `ManagedRuntime` outside
  comments, including destructured forms such as
  `const { runPromise } = Effect`; renamed bindings are not detected.

### Task contract and plugin compatibility

- `packages/core/src/_base.ts` defines a union:
  `Task = PromiseTask | EffectTask`. `EffectTask` methods return
  `Effect.Effect<A, TaskError, TaskServices>`, where
  `TaskServices = ProcessRunner`. `PromiseTask` keeps the original Promise
  signatures.
- `toTaskEffect(taskId, invoke)` in
  [`packages/core/src/task-effect.ts`](../../../packages/core/src/task-effect.ts)
  normalizes both shapes: the invocation is lazy (`Effect.suspend`), a
  synchronous throw or promise rejection becomes a `TaskError` with the
  pre-Effect message text, and an already-Effect result passes through
  untouched.
- `defineTask` in
  [`packages/tasks/src/factory/define-task.ts`](../../../packages/tasks/src/factory/define-task.ts)
  returns a `DefinedTask` (an `EffectTask` that always implements `getDeps`).
  Spec functions accept
  `SpecResult<A> = A | Promise<A> | Effect.Effect<A, TaskError, TaskServices>`,
  so an author may stay synchronous, return a Promise, or return an Effect.
  Failures are labeled once at the `defineTask` boundary as
  `<method> failed: <String(cause)>`, matching the removed `wrapTask` text.
- External duck-typed Promise plugins keep working unchanged. `loadPluginTasks`
  collects `default`, `tasks`, and `task` exports as `Task`; the engine
  normalizes each method. Plugins may also export Effect tasks.

### Services

- `ProcessRunner` ([`services/process-runner.ts`](../../../packages/core/src/services/process-runner.ts)):
  a tinyexec wrapper using `Effect.tryPromise` with the Effect-provided
  `AbortSignal`; an optional timeout uses `Effect.timeoutOrElse` and fails with
  `ProcessError`.
- `DepsInstaller` ([`services/deps-installer.ts`](../../../packages/core/src/services/deps-installer.ts)):
  one batched dev/prod install, failing with `DepsInstallError`.
- `Prompter` ([`apps/xtarterize/src/ui/prompter.ts`](../../../apps/xtarterize/src/ui/prompter.ts)):
  the app-level prompt seam. Production provides the clack adapter through
  `Prompter.layer`; tests provide `createScriptedPrompter` or
  `scriptedPrompterLayer`. A cancelled prompt resolves to `null`, and a
  rejected prompt fails with `PromptError`. This replaces the process-global
  prompter singleton.
- `AppLayer` merges the three. `executePlan` requires
  `DepsInstaller | TaskServices`; `CommandSession.open` requires
  `DepsInstaller | ProcessRunner | Prompter`.

### Error model

- `packages/core/src/errors.ts` defines five `Data.TaggedError` classes:
  `FileSystemError` (internal, used by `utils/fs.ts`), `BackupError`,
  `TaskError`, `DepsInstallError`, and `ProcessError`. `TaskError` keeps
  `taskId`, `message`, and `cause`; `BackupError` and `FileSystemError` keep
  `path`. The raw cause is preserved.
- Failure text is preserved from the previous engine. `failureDetail`
  converts an `Exit`/`Cause` back to the pre-Effect message
  (`describeCause`, `Cause.pretty`); interrupt-only causes are re-raised as
  interrupts instead of being converted to errors.

### Concurrency, ordering, and isolation

- `collectTaskChecks` uses `Effect.forEach(..., { concurrency: 8 })`
  (`TASK_CONCURRENCY`). Each check runs under `Effect.exit`: a failed check
  logs `Failed to check <id>: <detail>` and yields
  `{ status: 'conflict', checkError }`, so one failing check never fails
  resolution. `Effect.forEach` preserves input order.
- `planTasks` runs checks and dry-runs at concurrency 8. `runDryRun` uses
  `Effect.exit`; a failure becomes a `dryRunError` entry with empty diffs.
  Dependency collection (`getDeps`) also runs at concurrency 8.
- `executePlan` applies entries sequentially, accumulating per-entry failures
  instead of aborting. Files are backed up with `Effect.forEach`; the spinner
  is acquired and released with `Effect.acquireUseRelease`; install failures
  are appended to `ApplyResult.errors`.
- Conflict and skip semantics, timing fields, and error strings are unchanged.

### Version pin and dependency cost

- `effect` is pinned to `4.0.0-rc.113` exactly in the `pnpm-workspace.yaml`
  catalog. `@xtarterize/core`, `@xtarterize/tasks`, and `apps/xtarterize`
  depend on it through `catalog:`.
- The `effect` package declares no runtime dependencies `[verified]`. The dev
  install is about 52MB on disk `[measured]`; bundlers tree-shake to the
  imported surface `[inferred]`.

### What stays plain

`detect.ts` and `detect/*`, `utils/fs.ts`, the read helpers in
`utils/pkg.ts`, `backup.ts`, `ensure-gitignore.ts`, `preflight.ts`,
`cli-args.ts`, `inquiry/*`, the diff/tags/logger utilities, `patchers`,
templates, and UI renderers stay plain TypeScript. They keep Promise or
plain-value contracts and do not compose Effects or run a runtime. Some throw
tagged errors (`FileSystemError`), and they are lifted at the nearest Effect
seam (`Effect.tryPromise` / `Effect.promise`), for example `liftLeaf` in
`apps/xtarterize/src/session.ts`.

### Out of scope

- No Schema, no `effect/unstable/cli`, no `@effect/platform-node`, no
  OpenTelemetry, no Effect in `patchers` or pure code, and no new retries,
  timeouts, or features beyond converting existing ones.
- `apps/create-xtarter-app` is not migrated. Its hand-rolled 3-attempt retry
  in `utils/download.ts` was deliberately left as plain TypeScript: converting
  it would change observable attempt logging and backoff, and the app is
  isolated.

## Verification

- Baseline `pnpm check:ci` was green with 709 tests; the final branch was green
  with 711 tests. At HEAD, `pnpm test` reports 711 passed and 6 skipped across
  64 test files (63 passed, 1 skipped) `[verified]`.
- CLI output comparisons against the baseline build `[reported during the
  refactor]`: `diff --json` is byte-identical; `list --json` and `check --json`
  are identical except timing fields; `doctor` is byte-identical.
- SIGINT during an interactive prompt exits 0 within about 250ms. The baseline
  exited 0 immediately, so the deliberate difference is a grace period
  (`SIGNAL_EXIT_GRACE_MS = 250`, an unref'd timer in
  `apps/xtarterize/src/index.ts`); a second SIGINT exits 0 immediately
  `[reported during the refactor; the code at HEAD matches]`.
- The create-xtarter-app bundle initially grew because it imported
  `@xtarterize/core` helpers and core now imports Effect. Built from both
  revisions `[verified]`, the dist total went from 138.08 kB on `main` to
  209.58 kB, and the scaffold chunk from 85.14 kB (gzip 26.43 kB) to
  156.63 kB (gzip 51.11 kB). After the `@xtarterize/core/plain` entry landed,
  the app's dist total is 99.36 kB and its scaffold chunk is 46.42 kB (gzip
  15.22 kB), with no `effect` in the output or in `inlinedDependencies`
  `[verified]`.

## Rationale

- ADR 035 failed because Effect was wrapped and unwrapped at the same
  boundary. Here the Effect channel spans the main seam end to end: task
  method, normalization, engine, session, and the single runtime edge. There
  is no per-call unwrap.
- Cancellation and resource release become structural: the `AbortSignal`
  flows through `runPromiseExit`, and the spinner lifecycle uses
  `acquireUseRelease`. The previous `Promise.race` plus `setTimeout` timeout
  and the manual cache map disappear.
- Typed failures now travel the whole path, and failure rendering happens
  once, at the runtime edge.
- Keeping `PromiseTask` in the union preserves the external plugin contract,
  so the ecosystem cost of the refactor is zero for existing plugins.
- The runtime cost is deliberate and bounded: `effect` has no runtime
  dependencies, the version is pinned exactly, and the heavy install stays in
  development.

## Alternatives Considered

1. **Internals-only Effect behind a Promise public API.** Repeats ADR 035's
   wrap/unwrap failure: the typed channel ends at the same boundary where it
   starts, so cancellation, service wiring, and error rendering stay manual.
2. **Effect everywhere, including detection and filesystem, with
   `@effect/platform-node`.** Over-application. The RC platform package
   currently requires `effect@^4.0.0-rc.115` while core pins
   `4.0.0-rc.113`, and its in-memory filesystem layers duplicate the fixture
   strategy the testing policy does not want.
3. **Keep `Task` Promise-based and convert only core pipelines.** Leaves the
   main seam (task methods) outside the typed channel and still needs a
   per-call lift, so the engine's own services and cancellation stay
   untyped.
4. **Status quo (no Effect).** Keeps manual cancellation threading, the
   timeout race, the cache map, and the prompter singleton.

## Consequences

### Positive

- One cancellation, resource, and error model across the CLI lifecycle.
- Bespoke machinery is deleted: `mapWithConcurrency` and `CONCURRENCY`,
  `wrapTask`, the `Promise.race` timeout helper, the Promise cache map, and
  the prompter singleton.
- Existing Promise plugins keep working unchanged.
- `effect` itself has no runtime dependencies, so the tree-shaken runtime
  surface is what is imported.

### Negative

- The dependency is pinned to an exact release candidate, so upgrades are
  deliberate and RC API drift is a recurring maintenance item.
- Development install size grows by about 52MB, and every non-Effect consumer
  must import `@xtarterize/core/plain` instead of the root entry. Without it,
  `apps/create-xtarter-app` carried about 71.5 kB of extra dist output; with
  it, that app builds at 99.36 kB total (46.42 kB scaffold chunk, gzip
  15.22 kB), below the 138.08 kB `main` baseline `[verified]`.
- Contributors must understand the boundary rule, services, and layers to
  work on the CLI.
- SIGINT during a prompt now waits through a 250ms grace period instead of
  exiting immediately.
- The boundary rule is enforced mechanically by
  `scripts/check-effect-boundaries.mjs` in `pnpm check` and `pnpm check:ci`.

### Related Decisions

- ADR 019 (Effect TS error handling) - superseded by ADR 035 and not restored
  by this ADR: there is no Promise boundary and no `Equal.equals`.
- ADR 035 (Effect removal) - superseded by this ADR.
- ADR 028 (apply plan and execute) - the plan/execute seam now returns
  Effects; its semantics are unchanged.
- ADR 029 (task spec) - `defineTask` now returns an `EffectTask`.
- ADR 030 (command session) - session methods now return Effects and prompts
  come from the `Prompter` service instead of a process-global singleton.
- ADR 031 (single comparison primitive) - `isDeepStrictEqual` remains the only
  deep-equality primitive.
- ADR 002 (package boundaries) - `@xtarterize/core` depends on `effect`
  again, pinned through the workspace catalog.
