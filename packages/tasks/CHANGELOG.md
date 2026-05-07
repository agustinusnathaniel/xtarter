# @xtarterize/tasks

## 1.4.2

### Patch Changes

- [`d74c677`](https://github.com/agustinusnathaniel/xtarterize/commit/d74c677de59f9a446318fd9b61c7106a385d41a4) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - refactor: add antd, heroui, chakra-ui agent skills check

- Updated dependencies []:
  - @xtarterize/core@1.4.2
  - @xtarterize/patchers@1.4.2

## 1.4.1

### Patch Changes

- Updated dependencies [[`5f5fe9a`](https://github.com/agustinusnathaniel/xtarterize/commit/5f5fe9a2df17274a71afcb853cba4e684c0499ec)]:
  - @xtarterize/patchers@1.4.1
  - @xtarterize/core@1.4.1

## 1.4.0

### Minor Changes

- [`52511f0`](https://github.com/agustinusnathaniel/xtarterize/commit/52511f048510f2bfdd81afccd97545eb69d1264d) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - feat: add pnpm workspace catalog for centralized dependency versions

  feat(tasks): add editorconfig, npmrc, nvmrc, lint-staged, and git hooks tasks

  refactor(factory): add depCondition option and dynamic filepath support to PackageJsonTask

### Patch Changes

- [`52511f0`](https://github.com/agustinusnathaniel/xtarterize/commit/52511f048510f2bfdd81afccd97545eb69d1264d) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - fix(tasks): exclude .agents and .claude dirs from Biome file includes

  fix(tasks): make knip task applicable to all projects with format-aware config

  fix(tasks): replace non-null assertions with type-safe depName guards

- Updated dependencies [[`52511f0`](https://github.com/agustinusnathaniel/xtarterize/commit/52511f048510f2bfdd81afccd97545eb69d1264d), [`52511f0`](https://github.com/agustinusnathaniel/xtarterize/commit/52511f048510f2bfdd81afccd97545eb69d1264d)]:
  - @xtarterize/core@1.4.0
  - @xtarterize/patchers@1.4.0

## 1.3.0

### Minor Changes

- [`3534a6f`](https://github.com/agustinusnathaniel/xtarterize/commit/3534a6f981ba5ac41fed9658cd06f77560979dfb) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - Expand skills-install catalog with 20+ new stack-specific skills and refactor to declarative array format

  - Refactored `getSkillsToInstall` from imperative `if/push` blocks to a declarative `SKILL_CATALOG` array with per-skill `condition` functions for easier maintenance
  - Added new skills across multiple categories:
    - **Frontend/UI**: `baseline-ui`, `fixing-accessibility`, `fixing-metadata`, `fixing-motion-performance`
    - **React**: `react-dev`, `react-useeffect`
    - **Vue/Nuxt**: `vue`, `vue-best-practices`, `nuxt`
    - **Expo/RN**: `upgrading-expo`, `vercel-react-native-skills`
    - **Build tools**: `vite`, `vitest`, `tsdown`, `turborepo`
    - **Database/Auth**: `supabase-postgres-best-practices`, `postgres-drizzle`, `redis-best-practices`, `better-auth-best-practices`, `create-auth-skill`
    - **AI/SDKs**: `ai-sdk`
    - **Specialized**: `remotion-best-practices`
  - Updated tests and documentation to reflect the expanded catalog

### Patch Changes

- Updated dependencies [[`3534a6f`](https://github.com/agustinusnathaniel/xtarterize/commit/3534a6f981ba5ac41fed9658cd06f77560979dfb)]:
  - @xtarterize/core@1.3.0
  - @xtarterize/patchers@1.3.0

## 1.2.1

### Patch Changes

- Updated dependencies []:
  - @xtarterize/core@1.2.1
  - @xtarterize/patchers@1.2.1

## 1.2.0

### Minor Changes

- [`ccd9287`](https://github.com/agustinusnathaniel/xtarterize/commit/ccd9287afd967ed1ea0ef0c64b4a4a468e95b550) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - feat: add `patchJson` for surgical JSON text edits using `jsonc-parser`

  Replaced `JSON.stringify(mergeJson(...), null, 2)` with `patchJson`, which performs byte-level text edits via Microsoft's [`jsonc-parser`](https://github.com/microsoft/node-jsonc-parser). This preserves:

  - Comments (`// inline` and `/* block */`)
  - Key ordering
  - Whitespace and indentation style
  - Trailing commas (in JSONC)

  Applies to all JSON config tasks: `createJsonMergeTask`, `createMultiFileJsonMergeTask`, and `createPackageJsonTask`.

  **BREAKING CHANGE for consumers:** `@xtarterize/patchers` now requires `jsonc-parser` as a runtime dependency. The CLI bundler marks it as `neverBundle` to avoid inline bundling issues.

- [`ccd9287`](https://github.com/agustinusnathaniel/xtarterize/commit/ccd9287afd967ed1ea0ef0c64b4a4a468e95b550) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - feat: smart equivalence detection across all task types

  Tasks now detect equivalence at the **value/content level**, not just by key name. This prevents redundant or conflicting diffs when the same configuration already exists in a different form.

  **Package scripts** — `createPackageJsonTask` skips adding a script if the **exact same command string** already exists under any script name. For example, `"type:check": "tsc --noEmit"` prevents adding `"typecheck": "tsc --noEmit"`.

  **JSON config `extends`** — Added `normalizeExtends` helper. `"extends": "config:base"` is now treated as equivalent to `"extends": ["config:base"]"` during comparison. Used by `biomeTask` and `renovateTask`.

  **Text files** — `createSimpleFileTask` now normalizes line endings (`\r\n` → `\n`) before comparing content, preventing false mismatches on CRLF files.

  **Behavior change:** Tasks that previously returned `conflict` for script mismatches now return `patch` and only add the _missing_ scripts. Existing scripts are never overwritten.

### Patch Changes

- [`ccd9287`](https://github.com/agustinusnathaniel/xtarterize/commit/ccd9287afd967ed1ea0ef0c64b4a4a468e95b550) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - fix: `renovateTask` and `biomeTask` extends handling

  - Converted `renovateTask` from `createSimpleFileTask` to `createJsonMergeTask` so it properly deep-merges with existing `renovate.json` / `renovate.json5` configs instead of conflicting when the file already exists
  - Fixed `biomeTask` to handle string-form `extends` values (e.g., `"extends": "ultracite"`) in addition to arrays
  - Added `checkFn` to `renovateTask` for proper `skip` detection when the config already matches

- [`ccd9287`](https://github.com/agustinusnathaniel/xtarterize/commit/ccd9287afd967ed1ea0ef0c64b4a4a468e95b550) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - fix: resolveTaskFile incorrectly stripping `.config` from filenames

  `resolveTaskFile` used `filepath.replace(/\.[^.]+$/, '')` which stripped the `.config` suffix from names like `commitlint.config.ts`, causing the file finder to search for `commitlint.ts` instead of `commitlint.config.ts`. The logic now checks whether the existing extension is in the allowed list before stripping, and falls back to searching with the full filename.

- [`5b93cc4`](https://github.com/agustinusnathaniel/xtarterize/commit/5b93cc443fbe95d6ec777daa1f47e4520e25f3e1) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - chore: update dependencies to latest safe versions

  - `@clack/prompts` ^1.2.0 → ^1.3.0
  - `astro` ^6.1.10 → ^6.2.1
  - `sharp` ^0.34.3 → ^0.34.5
  - `pnpm` ^10.24.0 → ^10.33.2 (packageManager)
  - `turbo` ^2.9.6 → ^2.9.7
  - `defu` ^6.1.4 → ^6.1.7
  - `js-yaml` ^4.1.0 → ^4.1.1
  - Removed deprecated `@types/diff` (diff@9 ships built-in types)
  - `@tailwindcss/vite` kept at 4.2.2 (4.2.4 incompatible with current Vite)

- Updated dependencies [[`ccd9287`](https://github.com/agustinusnathaniel/xtarterize/commit/ccd9287afd967ed1ea0ef0c64b4a4a468e95b550), [`5b93cc4`](https://github.com/agustinusnathaniel/xtarterize/commit/5b93cc443fbe95d6ec777daa1f47e4520e25f3e1)]:
  - @xtarterize/patchers@1.2.0
  - @xtarterize/core@1.2.0

## 1.1.1

### Patch Changes

- Updated dependencies []:
  - @xtarterize/core@1.1.1
  - @xtarterize/patchers@1.1.1

## 1.1.0

### Patch Changes

- Updated dependencies []:
  - @xtarterize/core@1.1.0
  - @xtarterize/patchers@1.1.0

## 1.0.1

### Patch Changes

- Updated dependencies []:
  - @xtarterize/core@1.0.1
  - @xtarterize/patchers@1.0.1

## 1.0.0

### Patch Changes

- Updated dependencies []:
  - @xtarterize/core@1.0.0
  - @xtarterize/patchers@1.0.0
