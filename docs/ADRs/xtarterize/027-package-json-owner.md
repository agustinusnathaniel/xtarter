# ADR 027: Single PackageJson Owner in Tasks

## Status

Accepted

## Date

2026-09-10

## Context

`package.json` had three writers: the task factory, which cached the parsed file and wrote the whole object back; a text-based patch writer for one task; and the package manager run during dependency install, which rewrites the file itself. The cache went stale after other writers ran, and within one apply a whole-object write could overwrite dependencies the install had just added. Preview and apply also serialized differently, so the diff's `after` was not what landed, breaking the dry-run contract.

## Decision

One module owns every xtarterize write to `package.json`. It reads the file fresh on each call, applies changes as a JSON merge patch against current file text, and returns the before/after pair; apply recomputes and writes that pair. Comments, indentation, key order, and trailing whitespace survive, and a change that is already present is a no-op. The previous whole-object writer and its cache are removed.

## Rationale

- Patch-based writes preserve formatting, and computing against current text makes the computed `after` equal the written bytes.
- Fresh reads make cross-writer staleness structurally impossible; installs are external writers, so the owner never caches.

## Alternatives Considered

- **Object-based writes in core.** Loses comments and key order.
- **A run-scoped store shared between tasks.** Needs a new public task field or ambient state.
- **Split ownership between modules.** Keeps the second writer and the overwrite precedence.
- **Keep the cache and invalidate it.** Still races external writers and user edits.

## Consequences

- Formatting, comments, and key order survive xtarterize writes, and preview matches apply.
- Every apply re-reads and rewrites the file, a small cost per run.
- A user or process can edit the file between compute and apply; the last writer wins, so apply recomputes instead of restoring stale bytes.
