# ADR 035: Remove Effect TS in Favor of Plain Async/Await with Bounded Concurrency

## Status

Superseded by [ADR 036](036-effect-orchestration-layer.md).

## Date

2026-09-11

Removed Effect from the core package in favor of plain async/await with a local bounded-concurrency helper, because most call sites wrapped a single operation only to unwrap it at the same boundary. ADR 036 re-adopted Effect as the CLI orchestration layer after the command lifecycle needed cancellation, resource release, and single-point failure rendering.
