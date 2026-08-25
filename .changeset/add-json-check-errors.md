---
'xtarterize': patch
---

fix: `add --all` JSON output no longer claims success when a task check fails

When a task's `check()` threw during `add --all --format json` (e.g. a misbehaving plugin task), the command set exit code 1 but still emitted `{"ok": true}` — the JSON `ok` field disagreed with the process exit code. Check failures are now collected into the reported errors, so `ok` is false and the errors array names the failed checks whenever any task check throws.
