# ADR 022: Run Manifest for Undo Support

## Status

Accepted

## Date

2026-05-28

## Context

`xtarterize` backs up every file before modifying it (in `apply.ts`), storing timestamped copies in `.xtarterize/backups/` with an index (`.index.json`). The existing `restore` command can revert a single file by path.

Users needed a way to **undo an entire run** - reverting all files modified by `init`, `sync`, or `add` in one command. The backup index tracks files individually with timestamps, but there was no way to know which files belonged to the same run.

Two approaches were considered:

1. **Timestamp proximity grouping** - scan `.index.json`, group backups within a narrow time window (e.g., 2 seconds) as "same run"
2. **Run manifest** - write a `last-run.json` during apply that explicitly lists all files backed up in that run

## Decision

Add a **run manifest** (`last-run.json`) written by `apply.ts` after the backup phase, consumed by a new `undo` command.

### Manifest format

```typescript
interface RunManifest {
  timestamp: string; // ISO timestamp of the run
  files: string[]; // all filepaths backed up in this run
}
```

**Location:** `.xtarterize/backups/last-run.json`

### Write point

In `runApply()`, after all files are backed up and before tasks are applied:

```typescript
// Backup each unique file only once before applying any tasks
for (const filepath of filesToBackup) {
  await backupFile(cwd, filepath);
}

// Write manifest so `undo` can restore all files from this run
if (filesToBackup.size > 0) {
  await writeRunManifest(cwd, [...filesToBackup]);
}
```

### Undo flow

1. Read `last-run.json`
2. Show files that will be restored
3. Confirm (unless `--quiet`)
4. For each file, look up the most recent backup from `.index.json` and restore it

## Rationale

- **Deterministic:** The manifest is an explicit list, not a heuristic. No edge cases around timestamp drift, parallel runs, or slow I/O.
- **Minimal overhead:** One extra JSON write (~microseconds) during apply. The manifest is tiny (<1KB even for large runs).
- **Composable:** The manifest could later be extended with task IDs, profile snapshots, or run metadata without changing the undo flow.
- **Follows existing patterns:** Same storage location as the backup index, same atomic write strategy.

## Alternatives Considered

1. **Timestamp proximity grouping:** Simpler (no extra file), but fragile. If two `init` runs happen within 2 seconds (e.g., CI), files from different runs could be grouped together. If a run takes >2 seconds between first and last backup, files could be split across groups.
2. **Run ID in backup index:** Add a `runId` field to each `Backup` entry in `.index.json`. More invasive - changes the index schema and requires migrating existing indexes.
3. **Git-based diff:** Use `git diff` to find changed files since before the run. Doesn't work for new files (untracked), and couples undo to git.

## Consequences

### Positive

- ✅ `xtarterize undo` reverts an entire run in one command
- ✅ Deterministic - no heuristic grouping
- ✅ Negligible performance overhead (one extra file write)
- ✅ Manifest is extensible for future features (run history, audit trail)

### Negative

- ⚠️ Adds `last-run.json` to `.xtarterize/backups/` (alongside existing `.index.json`)
- ⚠️ Only tracks the **most recent** run - no history of previous runs (by design; the backup index retains all backups)
- ⚠️ If `apply.ts` crashes between backup and manifest write, the manifest won't reflect the partial backup (acceptable - `restore <file>` still works for individual files)
