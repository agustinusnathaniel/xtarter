---
'@xtarterize/tasks': patch
'xtarterize': patch
---

Preserve existing `pnpm-workspace.yaml` content in the workspace task

The `workspace/pnpm-workspace` task now patches an existing `packages:` list
in place instead of replacing the file with a fixed template. Only missing
`apps/*` and `packages/*` entries are inserted; comments, `catalog:`,
`overrides:`, `onlyBuiltDependencies`, extra keys, ordering, indentation,
quote style, and line endings are preserved. Files without a `packages:` key
are left untouched, so a settings-only `pnpm-workspace.yaml` never gains
workspace globs. Layouts that cannot be edited safely, such as a flow-style
`packages:` list missing a glob, are reported as conflicts rather than
rewritten.
