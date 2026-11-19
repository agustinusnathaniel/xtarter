---
"@xtarterize/core": patch
"@xtarterize/tasks": patch
---

Fix `agent/skills-install` failing with "Invalid package manager specification in package.json (pnpm@>=11); expected a semver version" when `pnpm` is a Corepack shim. Corepack rejects the range-only `devEngines.packageManager` that `quality/package-engines` writes, so the skills CLI now runs with `COREPACK_ENABLE_PROJECT_SPEC=0`. `ProcessRunner.run` accepts an `env` option for this.
