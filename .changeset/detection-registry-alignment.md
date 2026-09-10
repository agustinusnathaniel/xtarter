---
'xtarterize': patch
---

Align project detection with the detection registry

- Profile cache version 3 recomputes when `bun.lock` appears or changes, when `.git` appears or disappears, and when `services/` workspace directories change.
- Workspace packages under `services/` are detected consistently with `packages/` and `apps/`, and `hasGit` stays fresh when `.git` changes.
- `tsconfig.jsonc` now sets both `existing.tsconfig` and `typescript`, and `.eslintrc.mjs` is detected consistently with the doctor legacy-config check.
- Malformed cache entries (for example, missing `configDirs` or `lockfiles`) recompute instead of throwing.
