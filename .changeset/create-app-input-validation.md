---
'create-xtarter-app': patch
---

Validate inputs before touching the target directory and report git failures truthfully

- Template and package manager values are validated before `--force` can remove an existing directory, so an invalid invocation never deletes anything.
- A failed git initialization logs a warning and reports `gitInitialized: false` in `--json` output instead of discarding an otherwise successful scaffold.
- The exported `initializeGit` now resolves `false` on git failure instead of rejecting, so programmatic callers branch on the returned boolean.
- `--json` output reports the real scaffold result values.
