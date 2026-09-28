---
'@xtarterize/tasks': patch
---

Generate workflows with pnpm/setup@v3 and a single install

Newly applied CI, release, and auto-update workflows now install pnpm with
`pnpm/setup@v3` instead of `v2`, which keys the store cache on the run and
restores the freshest lockfile match, and detects a Node.js version from
`.node-version`, `.nvmrc`, or `.tool-versions` when the project does not
declare one in `devEngines.runtime`.

`pnpm/setup` already runs `pnpm install` itself, so the templates no longer
emit a second install step for pnpm projects. npm, yarn, and bun workflows keep
their explicit install step.

The pnpm setup step also sets `require-lockfile: 'true'`, so a pnpm project with
no lockfile now fails CI instead of letting pnpm resolve from the registry and
write one. The `quality/package-engines` task writes a `>=11` pnpm floor to match
what `pnpm/setup` can install, instead of `>=9`, which the action rejects.

Re-run `sync` to update an existing project's workflows.
