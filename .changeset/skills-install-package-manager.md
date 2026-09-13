---
'@xtarterize/tasks': patch
---

Run the skills install through the project's package manager

`agent/skills-install` now selects the dlx executor that matches the detected
package manager: `pnpm dlx`, `yarn dlx` for Yarn Berry projects, and `bunx`,
while npm keeps `npx --yes`. npm 11 rejects `npx` when
`devEngines.packageManager` names another package manager (EBADDEVENGINES), and
`quality/package-engines` writes that field during `init`, so pnpm, Yarn Berry,
and bun projects no longer fail the skills task. Yarn classic has no `dlx`
command and keeps the `npx` fallback as the best available behavior.
