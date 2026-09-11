---
'xtarterize': patch
---

Align project detection with the detection registry

- Workspace packages under `services/` are detected consistently with `packages/` and `apps/`, and `hasGit` stays fresh when `.git` changes.
- `tsconfig.jsonc` now sets both `existing.tsconfig` and `typescript`, and `.eslintrc.mjs` is detected consistently with the doctor legacy-config check.
- Detection reads most inputs directly, and the registry declares the inputs and keyed detector entries that still have a runtime consumer; the profile cache was removed in a subsequent changeset.
