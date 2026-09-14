# ADR 022: Run Manifest for Undo Support

## Status

Accepted

## Date

2026-05-28

## Context

xtarterize backs up each file before modifying it and keeps an index of backups, so the `restore` command could revert a single file by path. It could not revert every file changed by one `init`, `sync`, or `add` run, because nothing recorded which backups belonged to the same run.

## Decision

Write a run manifest during apply that lists every file the run may touch, including files it creates, and consume it in a new `undo` command that restores the listed files after confirmation.

## Rationale

- An explicit list is deterministic; grouping by timestamp could merge two fast runs or split a slow one.
- The manifest is a tiny extra write and can later carry run metadata without changing the undo flow.

## Alternatives Considered

- **Timestamp proximity grouping.** Rejected: fragile when runs are close together or slow.
- **A run ID on each backup entry.** Rejected: changes the index schema and requires migrating existing indexes.
- **Git-based diff.** Rejected: misses untracked files and couples undo to git.

## Consequences

- `xtarterize undo` reverts an entire run in one command.
- Only the most recent run is tracked; older backups remain restorable file by file.
- A crash between backup and manifest write leaves the partial run untracked by `undo`, though per-file restore still works.
