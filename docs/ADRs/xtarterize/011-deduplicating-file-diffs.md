# ADR-011: Deduplicating File Diffs in CLI Output

**Status:** Accepted
**Date:** 2026-05-01

## Context

Several tasks can target the same config file. Each returned its own diff for that file, so the CLI showed overlapping diffs that rewrote the file multiple times and did not match the final result.

## Decision

Group diffs by file path before display. For JSON-family files, combine the per-task results into one final value with the surgical patch step and show a single unified diff per file. For other files, show only the last diff for that path. This affects display only; individual task logic is unchanged.

## Rationale

One diff per file shows the complete intended state and matches what apply writes, because tasks run sequentially and each patches the file the previous task left behind. Overlapping per-task diffs are confusing and none of them represents the final file.

## Alternatives Considered

- Show each task's diff separately: confusing, and no diff shows the final state.
- Merge diffs for all file types: non-JSON files have no shared merge strategy to combine.

## Consequences

- Diff and dry-run output is consolidated per JSON file.
- Non-JSON files still show individual diffs, so overlapping edits to the same non-JSON file remain visible separately.
- Merged output no longer attributes each change to its task.
- Merge order follows deterministic task execution order.
