---
'xtarterize': patch
---

fix: `add` reports conflicting tasks as not applied instead of claiming success

When a task's check returned `conflict` (e.g. `ts/strict` on a tsconfig that already
sets `strict: false`), `add` fell through to the apply step, where `applyTasks`
silently skipped the conflict (applied=0, errors=0) — the command then logged
"applied successfully" and exited 0 even though nothing was applied. Now `add`
detects the conflict up front, warns the user, exits 1, and never touches the
conflicting file. Interactive mode counts conflicts as skipped instead of applied,
and `diff` includes conflict diffs so they are visible before adding.
