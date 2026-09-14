# ADR 031: Single Deep-Equality Primitive

## Status

Accepted

## Date

2026-09-10

## Context

Three comparison strategies existed: an Effect-based deep-equal wrapper in core re-exported through the task factory, a private recursive copy inside the JSON patcher, and a serialized JSON string comparison in the file task factory. They could disagree, and the patcher duplicated equality logic that core already exported.

## Decision

Node's built-in deep-strict-equality check is the only deep-equality primitive. The core wrapper and its export disappear, the patcher's private copy is deleted, the serialized comparison is replaced, and importers call the built-in.

## Rationale

- No new dependency: Node provides the primitive.
- One comparison semantics for change detection across core, patchers, and tasks.
- No Effect-specific equality remains on a public path (ADR 019).
- The built-in matches the JSON-compatible values the task engine compares.

## Alternatives Considered

- **Keep the wrappers.** Three semantics that can drift; the patcher cannot import core, so it would keep a private copy.
- **Adopt a small deep-equal library.** A dependency for behavior Node already ships.
- **Per-call comparison.** Repeats the current inconsistency.
- **Keep the Effect wrapper and export it everywhere.** Keeps Effect on the public API and keeps serialized and recursive variants alive.

## Consequences

### Positive

- One primitive shared by patcher and core without cycles, no new dependency, and the key-order-dependent serialized comparison is gone.

### Negative

- Edge semantics change for values the wrappers treated differently, such as an undefined property versus a missing key. The existing patcher, task, and core suites cover the compared shapes and are the regression net.
