---
"xtarterize": patch
"@xtarterize/core": patch
---

`xtarterize add` now shows the diff hunks and `+/-` stats before asking to apply a change, matching `diff` and `init --dry-run`. A `pnpm-workspace.yaml` without a `packages:` key (such as the single-package placeholder or a pnpm settings-only file) no longer marks the project as a monorepo, so a second `init` run no longer rewrites `.vscode/settings.json` or switches task scope filtering.
