# ADR 036: Effect Orchestration Layer for CLI Command Programs

## Status

Accepted

ADR 037 removed external task plugin loading and the Promise task contract, so the plugin compatibility this ADR preserved no longer exists.

## Date

2026-09-12

## Context

ADR 019 adopted Effect behind a Promise boundary, and ADR 035 removed it because call sites wrapped a single operation only to unwrap it at the same boundary. The command lifecycle then accumulated concerns plain async/await handles poorly: hand-threaded cancellation, resource lifecycles with no structured release, duplicated isolation handling, a hand-rolled timeout and config cache, and a process-global prompt singleton that made test isolation awkward.

## Decision

Effect owns CLI command orchestration.

- Packages compose Effects and never run a runtime.
- One runtime edge runs one command program, forwards cancellation, renders failures once, and sets the exit code; every command uses it.
- Plain TypeScript leaves (detection, filesystem, patching, templates) keep plain contracts and are lifted at the nearest Effect seam.
- Non-Effect consumers import a plain entry that never reaches Effect; a lint plugin enforces the boundary.
- Task methods share one Effect-based interface; synchronous, Promise-, and Effect-returning spec functions normalize at the task-factory seam.
- Process execution, dependency installation, and prompts are app-layer services. Failures are tagged errors that preserve the cause and the previous failure text.

## Rationale

- ADR 035 failed because Effect was wrapped and unwrapped at the same boundary. Here the channel spans the whole CLI path with no per-call unwrap.
- Cancellation and resource release become structural rather than hand-threaded.
- Typed failures travel the whole path and render once, at the runtime edge.

## Alternatives Considered

- **Internals-only Effect behind a Promise public API.** Repeats ADR 035's wrap/unwrap failure; cancellation, service wiring, and error rendering stay manual.
- **Effect everywhere through the platform package.** Over-application; the platform package lags the pinned release candidate and its filesystem layers duplicate the fixture strategy.
- **Promise task interface with only core pipelines converted.** Leaves the main seam outside the typed channel.
- **Status quo without Effect.** Keeps manual cancellation threading, the timeout race, the cache map, and the prompt singleton.

## Consequences

### Positive

- One cancellation, resource, and error model across the CLI lifecycle.
- The bounded-concurrency helper, timeout race, hand-rolled Promise cache, and prompt singleton disappear; the raw config read keeps a cached memo.
- Effect declares no runtime dependencies, so the runtime surface is what is imported.

### Negative

- The dependency is pinned to an exact release candidate, so upgrades are deliberate and RC API drift is a recurring maintenance item.
- Contributors must understand the boundary rule, services, and layers to work on the CLI.
- Non-Effect consumers must import the plain entry or carry extra bundle output.
- SIGINT during a prompt waits through a grace period instead of exiting immediately.
