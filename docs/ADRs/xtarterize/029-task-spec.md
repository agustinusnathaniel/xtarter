# ADR 029: Task Spec Replaces Factory Option Bags

## Status

Accepted

## Date

2026-09-10

## Context

Tasks were built through several factories whose option bags overlapped, carried dead options, and defined dependencies in two shapes. Several tasks computed status separately from the diffs the factories produced, so check, dry run, and apply could disagree about the same project.

## Decision

One task spec replaces the factories. A spec declares metadata and applicability, targets with writer kinds, actions, and dependencies, and resolves once into a status and diffs.

- Target kinds: rendered text, JSON merge, the package manifest through its owner (ADR 027), and transform, which takes content in and out on a discovered file.
- An action target pairs a status probe with a run effect and reports no file diff.
- A per-target policy hook may force a conflict, seeing the same before and after the diff used.
- Dependencies are part of resolution.
- Apply performs the resolution's effects: the manifest owner writes that target kind and the standard writer handles file targets.

## Rationale

- One resolution produces status and diffs, so check, dry run, and apply agree.
- Transform targets carry the real config path, so backup and undo restore the actual file (ADR 022).
- Actions stop inventing backup entries, and the dead options and second dependency shape disappear.

## Alternatives Considered

- **Keep the factories and fix internals.** Three code paths and per-factory drift.
- **Two interfaces (content tasks plus callbacks).** More surface for the same risk.
- **Executor-coupled factories.** Blocks the side-effect-free plan (ADR 028).
- **Option bags plus validation.** Validation cannot unify check and diff.

## Consequences

### Positive

- Status and diff divergence becomes structurally impossible.
- Diffs, backups, and undo use the real config path.

### Negative

- Migration touches every task family, though the change per family is mechanical.
- Task authors learn one spec, and task documentation needs updating.
