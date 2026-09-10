# ADR 028: Apply Plan and Execute Seam

## Status

Accepted

## Date

2026-09-10

## Context

The apply pipeline is spread across `packages/core/src/apply.ts` and three
phase files (`check-phase.ts`, `dryrun-phase.ts`, `execute-phase.ts`), with a
mutable timing accumulator and `perTask` threaded through each. Two
consequences followed: dry-run content is discarded before execution, so
execution and preview cannot share a resolution, and batch install failures are
logged but never reported, so JSON output and exit codes say the run succeeded.
The CLI compounds this with `apps/xtarterize/src/utils/task-diffs.ts`, a second
dry-run collector for `diff` and preview.

## Decision

Split the pipeline into a side-effect-free plan and an executor:

- `planTasks(options)` returns an `ApplyPlan`: entries carrying task, status,
  diffs, `checkMs`, `dryRunMs`, and any `checkError` or `dryRunError`, plus
  dependency declarations and the backup set. It performs no writes, no
  backups, and no installs.
- `executePlan({ plan, cwd, profile, quiet })` returns an `ApplyResult`. It
  derives backup, one run manifest (ADR 022), one batch dependency install, and
  sequential apply from the plan.
- `applyTasks` remains as a convenience wrapper over both.
- Execution replays each task against current state, not planned bytes.
- Batch install failures surface in `ApplyResult.errors`, not only in logs.

`apply/check-phase.ts`, `apply/dryrun-phase.ts`, and `apply/execute-phase.ts`
are deleted. The CLI uses `planTasks` for diff, dry run, and interactive
preview, and `utils/task-diffs.ts` is deleted.

## Rationale

- One resolution feeds diff, dry run, apply, and reporting, so the four paths
  cannot drift.
- Execution must replay because the package manager rewrites `package.json`
  after planning; writing planned bytes would discard the dependencies the
  install just added.
- The plan governs backup and the run manifest, so `undo` reflects the whole
  operation.
- Timing and errors live on plan entries instead of an ambient accumulator.

## Alternatives Considered

- **Execution writes planned bytes.** Impossible as specified: the installer
  rewrites `package.json` after planning, and a user can edit files between
  plan and execute.
- **Plan kept private.** The CLI keeps its duplicate dry-run collector, which
  is where preview and apply drift originated.
- **Derive-only, no plan object.** Reporting and execution would each
  re-derive statuses, restoring the duplication.
- **Keep the phase files with a shared accumulator.** Removes neither the
  spread nor the discarded dry-run content.

## Consequences

### Positive

- The CLI reuses one plan for diff, dry run, and preview; install failures
  affect JSON output and exit codes.
- Per-entry errors are structured and testable.

### Negative

- `ApplyPlan` becomes a public shape that must stay compatible.
- A run whose install fails now reports failure where it previously logged and
  continued; this is a user-facing behavior change and needs a changeset.
- `ApplyResult.timing.applyMs` now measures execution only (backup, install,
  apply) after planning, while planning time is carried per entry in `checkMs`
  and `dryRunMs`.

### Related Decisions

- ADR 008 (tristate status), ADR 022 (run manifest), Plan 043 Phase 2.
