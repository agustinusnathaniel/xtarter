# ADR 019: Effect TS v4 for Internal Error Handling and Workflow Composition

## Status

Superseded

Superseded by [ADR 035](035-effect-removal-async-await.md), which [ADR 036](036-effect-orchestration-layer.md) in turn supersedes. ADR 036 re-adopts Effect as the CLI orchestration layer without restoring this ADR's Promise boundary or `Equal.equals`.

## Date

2026-05-21

## Decision

Adopt Effect TS v4 internally for typed tagged errors and structured concurrency, keeping a `Promise<T>` public boundary.

ADR 035 removed it because call sites unwrapped Effect at the same boundary, so typed errors added ceremony without benefit; ADR 036 later re-adopted Effect as the CLI orchestration layer on different terms.
