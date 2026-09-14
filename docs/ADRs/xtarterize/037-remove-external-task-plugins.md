# ADR 037: Remove External Task Plugins and the Promise Task Contract

## Status

Accepted

## Date

2026-09-13

## Context

ADR 036 re-adopted Effect as the CLI orchestration layer and kept the original Promise task contract so external, duck-typed task plugins would keep working. That compatibility promise rested on a loader that was never exercised in production: the plugin system was marked internal and documented as untested, and it carried a dynamic import of a config-supplied package name with specifier validation, a load timeout, export discovery, and deduplication. It had no visible consumers, and the repository owner authorized removal as part of production-code reduction.

## Decision

Remove external task plugin loading and the Promise task contract.

- The `plugins` key is no longer read from the config files; the same files still support `only` and `skip` task selection.
- Task methods share a single Effect-based interface; the Promise shape and the union are gone.
- Normalization stays for first-party spec functions and plain async helpers, no longer for external plugins.
- The CLI loads built-in tasks directly, and no dependencies change; Effect remains the orchestration layer.

## Rationale

- The system was internal and untested in production, yet it carried the maintenance and review cost of a public contract.
- External loading through dynamic import is security-sensitive; removing it removes the specifier validation and timeout machinery.
- With no visible consumers, the compatibility promise protected nobody while splitting the task contract in two.

## Alternatives Considered

- **Keep the plugin system.** Retains an untested dynamic-import path and a split task contract for a feature with no demonstrated use.
- **Keep loading but require Effect-only plugins.** Keeps the dynamic-import surface and promises compatibility for an ecosystem that does not exist.
- **Deprecate first with warnings.** Adds a release cycle and warning paths while the loader keeps running; a major bump communicates the break more directly.

## Consequences

### Positive

- The loader, specifier validation, timeout handling, export discovery, and union normalization leave the maintained surface.
- The task boundary is one contract, persisted selection keeps working with no migration, and no dependency or runtime changes.

### Negative

- Breaking for any project that configured `plugins`; those task packages no longer load, and the release takes a major bump.
- Anyone relying on the documented Promise contract must migrate to built-in tasks.
- A future external extension point must be designed from scratch.
