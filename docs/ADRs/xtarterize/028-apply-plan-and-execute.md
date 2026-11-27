# ADR 028: Plan, Then Execute Against Current Files

## Status

Accepted

## Date

2026-09-10

## Context

The apply pipeline once mixed planning and execution: preview content was discarded before apply, batch install failures were logged but reported as success, and the CLI kept a second dry-run collector. `package.json` had three writers (a cached whole-object writer, a text patch writer, and the package manager during install), so a cached write could erase dependencies the install had just added. Tasks also computed status separately from their diffs, so check, dry run, and apply could disagree. This record absorbs ADR 027 (one `package.json` owner) and the invariant behind ADR 029 (the task spec).

## Decision

- Each task resolves once into a status and its diffs; check, dry run, and apply all read that one resolution.
- Planning has no side effects. It returns entries with status, diffs, timing, and errors, plus dependency declarations and the backup set. Diff, dry run, and interactive preview all use the plan.
- Execution takes the plan and derives the backup, one run manifest, one batch dependency install, and the sequential applies. Each apply replays its task against the current files rather than writing planned bytes. Install failures surface in the result's errors and exit code.
- One module owns every xtarterize write to `package.json`. It reads the file fresh on each call and applies a merge patch against the current text, never a cached object.

## Rationale

- The package manager rewrites `package.json` after planning, and users can edit files in between. Writing planned bytes or a cached object would discard installed dependencies or user edits, which is why execution replays and the owner never caches.
- One resolution feeds every path, so preview and apply cannot drift.
- The plan governs backup and the run manifest, so undo covers the whole operation (ADR 022).

## Alternatives Considered

- **Execute by writing planned bytes.** Discards what the installer and the user changed after planning.
- **Cache `package.json` and invalidate it.** Still races external writers.
- **A run-scoped store shared between tasks.** Needs a new public task field or ambient state.
- **Keep the plan private.** The CLI keeps its duplicate dry-run collector, where preview and apply drift began.
- **Compute status separately from diffs.** The disagreement this record removes.

## Consequences

- A run whose install fails reports failure instead of logging and continuing.
- The plan shape is public and must stay compatible.
- Every apply re-reads and rewrites `package.json`; if something edits it between compute and apply, the last writer wins.
