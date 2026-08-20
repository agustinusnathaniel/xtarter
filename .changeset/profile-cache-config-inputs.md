---
"@xtarterize/core": patch
---

Fix stale project-profile cache when root config files change

The profile cache fingerprint only covered package.json, the lockfile, and
`.github`/`.vscode`/`.changeset` contents. Detectors also read root config
files such as `tsconfig.json`, `vite.config.*`, ESLint/Oxlint/Oxfmt configs,
`AGENTS.md`, `CLAUDE.md`, bundler configs, monorepo markers, and `.nvmrc` —
none of which invalidated the cache. Adding or removing any of these could
return an outdated profile until an unrelated fingerprint change.

The fingerprint now covers every detector-relevant root file via a shared
declarative list (`ROOT_DETECTOR_INPUTS`), invalidating the cache when such a
file is added, removed, or modified. Cache entries are versioned (v2) so
existing stale caches are recomputed once on upgrade.
