---
'xtarterize': patch
---

Surface apply failures and preserve existing files through the deepened task engine

- Batch dependency install failures are now reported as apply errors and set a failing exit code instead of only logging to the console.
- Interactive `add` plans and executes the confirmed selection once, so one run manifest covers the whole operation and `undo` restores all of it.
- `package.json` changes are patched through the package.json owner, so comments, indentation, key order, and unrelated entries survive apply.
- Vite plugin tasks carry the real config filepath in their diffs and backups, so `undo` and `restore` cover the actual config file.
- A project without a Vite config no longer reports an apply error for Vite plugin tasks.
