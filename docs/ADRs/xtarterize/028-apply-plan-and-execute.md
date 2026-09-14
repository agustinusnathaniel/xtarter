# ADR 028: Apply Plan and Execute Seam

## Status

Accepted

## Date

2026-09-10

## Context

The apply pipeline mixed planning and execution across several phase modules with shared mutable timing state. Dry-run content was discarded before execution, so preview and execution could drift, and batch install failures were logged but never reported, so JSON output and exit codes claimed success. The CLI kept a second dry-run collector for diff and preview, compounding the divergence.

## Decision

Split the pipeline into a side-effect-free plan and an executor. Planning returns a plan whose entries carry task, status, diffs, timing, and any check or dry-run error, plus dependency declarations and the backup set; it performs no writes, backups, or installs. Execution takes the plan and derives backup, one run manifest, one batch dependency install, and sequential applies from it, replaying each task against current state rather than planned bytes. Install failures surface in the result's errors. The CLI uses the plan for diff, dry run, and interactive preview.

## Rationale

- One resolution feeds diff, dry run, apply, and reporting, so the paths cannot drift.
- Execution must replay because the package manager rewrites `package.json` after planning; writing planned bytes would discard installed dependencies.
- The plan governs backup and the run manifest, so undo reflects the whole operation.

## Alternatives Considered

- **Execution writes planned bytes.** Impossible: the installer rewrites `package.json` after planning, and users can edit files in between.
- **Keep the plan private.** The CLI keeps its duplicate dry-run collector, which is where preview and apply drift originated.
- **Derive without a plan object.** Reporting and execution would re-derive statuses, restoring the duplication.
- **Keep the phase modules with a shared accumulator.** Removes neither the spread nor the discarded dry-run content.

## Consequences

- Diff, dry run, and preview share one plan, and install failures affect JSON output and exit codes.
- A run whose install fails now reports failure instead of logging and continuing, a user-facing behavior change.
- The plan shape becomes public and must stay compatible.
- Timing is measured per entry during planning and separately for execution.
