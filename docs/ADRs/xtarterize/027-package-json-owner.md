# ADR 027: Single PackageJson Owner in Tasks

## Status

Accepted

## Date

2026-09-10

## Context

`package.json` has three writers: whole-object writes from the task factory
(which caches the parsed file in a module-level `__pkgCache` and writes the
object back with `pkg-types`, `packages/tasks/src/factory/task.ts`), text
writes from `quality/package-engines` (via `patchJson`), and the package
manager itself, which `installDependenciesBatch` spawns to install dependencies
and which rewrites the file as a side effect (`packages/core/src/utils/pkg.ts`).

The cache goes stale when other writers touch the file, and within one
`applyTasks` run a whole-object writer can overwrite dependency entries the
install just added. Preview and apply also serialize differently (`patchJson`
versus the in-memory object), so comments are lost and the diff's `after` is
not what lands, breaking the dry-run contract and conflicting with ADR 010.

## Decision

One module, `packages/tasks/src/factory/package-json.ts`, is the only
xtarterize writer of `package.json`. It exports:

- `readPackageJson(cwd)`: wraps the core reader. No second parser, no cache.
- `computePackageJsonChange(cwd, patch)`: applies a JSON merge patch with
  `patchJson` against current file text; returns `{ before, after, filepath }`
  or `null` when nothing changes.
- `applyPackageJsonChange(cwd, patch)`: recomputes against current text, writes
  with the core `writeFile`, and returns the same pair or `null`.

Rules: comments, indentation, key order, and trailing whitespace survive; a
change already present returns `null`; a missing file is created from the patch
at 2-space indent; invalid JSON throws from the patch parse. Installs are
external writers: the owner never caches, so a fresh read absorbs their
effects. The dead core writer `writePackageJson` is removed; the owner lives in
`packages/tasks` because core cannot depend on patchers (ADR 002).

Update (2026-09-11): `applyTasks` was removed after this ADR (see ADR 028).
Callers now compose `planTasks` and `executePlan` directly; the reference above
describes the state at the time of this decision.

## Rationale

- Patch-based writes preserve formatting (ADR 010), and computing against
  current text makes the computed `after` equal the written bytes.
- Fresh reads make cross-writer staleness structurally impossible; tasks owns
  the owner because core cannot depend on patchers (ADR 002), and ADR 021's
  profile cache stays separate.

Update (2026-09-11): the ADR 021 profile cache was removed (ADR 034). The
owner's fresh-read rule is unchanged; there is simply no other cache to stay
separate from.

## Alternatives Considered

- **Object-based writes in core.** Loses comments and ordered keys (ADR 010).
- **Run-scoped store.** Needs a new public `Task` field or ambient state.
- **Split ownership.** Keeps the second writer and the overwrite precedence.
- **Keep the cache and invalidate.** Still races external writers and edits.

## Consequences

### Positive

- Formatting, comments, and key order survive xtarterize writes.
- The diff's `after` is exactly what is written; dry-run parity is testable.
- Core loses a config writer; package boundaries stay intact.

### Negative

- Each apply re-reads and rewrites the file (small cost).
- External writers can interleave between compute and apply; the last writer
  wins, so apply recomputes rather than restoring stale bytes.

### Related Decisions

- ADR 002 (package boundaries), ADR 010 (JSON patching), ADR 021 (profile
  cache, superseded by ADR 034), Plan 043 Phase 1.
