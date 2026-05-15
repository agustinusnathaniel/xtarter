# @xtarterize/tasks

## 1.13.4

### Patch Changes

- [`e46e74a`](https://github.com/agustinusnathaniel/xtarter/commit/e46e74a111a7f26810124764dbb4b5f15dc88464) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - fix: move npx `--yes` flag before package name and add 60s timeout to agent/skills-install

  The `-y` flag was passed after `skills@latest` arguments, so npx still prompted
  "Ok to proceed?" and hung on user input. Moved `--yes` to a npx flag position
  before the package name, and added a 60-second timeout to prevent indefinite
  hanging on slow networks.

- Updated dependencies []:
  - @xtarterize/core@1.13.4
  - @xtarterize/patchers@1.13.4

## 1.13.3

### Patch Changes

- Updated dependencies []:
  - @xtarterize/core@1.13.3
  - @xtarterize/patchers@1.13.3

## 1.13.2

### Patch Changes

- Updated dependencies []:
  - @xtarterize/core@1.13.2
  - @xtarterize/patchers@1.13.2

## 1.13.1

### Patch Changes

- [`f1069d6`](https://github.com/agustinusnathaniel/xtarter/commit/f1069d6bea26aabece3ed030303642e1d3f14693) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - refactor: enrich oxlint and biome config templates with additional lint rules

  Add non-recommended rules mapped from typical ESLint configs:

  - Oxlint: max-params, eqeqeq, prefer-const, no-var, prefer-template, no-shadow, consistent-type-definitions, array-type, react rules, vitest overrides, unicorn relaxations, import rules
  - Biome: noExcessiveCognitiveComplexity, useMaxParams, useConsistentTypeDefinitions, useConsistentTestIt overrides

- Updated dependencies []:
  - @xtarterize/core@1.13.1
  - @xtarterize/patchers@1.13.1

## 1.13.0

### Minor Changes

- [#31](https://github.com/agustinusnathaniel/xtarter/pull/31) [`76953e4`](https://github.com/agustinusnathaniel/xtarter/commit/76953e423f4e0c652251f6a9c4d5b3eeefa6e9b7) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - feat: add oxlint and oxfmt support with Vite+ auto-detection

  When Vite+ is detected, xtarterize now configures oxlint/oxfmt (via `vp`) instead of Biome as the default linting/formatting stack:

  - **Scripts**: `vp lint` / `vp check` / `vp check --fix` for Vite+ projects (instead of `biome check .` / `biome check --write .`)
  - **Config**: `.oxlintrc.json` (with `consistent-type-imports`, `import/order`, `no-console` rules) and `.oxfmtrc.json` for Vite+ projects
  - **Standalone oxlint**: Direct `oxlint`/`oxfmt` commands when oxlint/oxfmt config exists without Vite+
  - **ESLint detection**: Existing ESLint setups are preserved — no lint tasks are applied
  - **CI**: Single `vp check` step for Vite+ projects (handles fmt + lint + typecheck)
  - **Lint-staged**: Skipped for Vite+ projects (uses `vp staged` via git hooks)
  - **Biome**: Config still generated for IDE fallback, but scripts point to `vp` when Vite+ is present

### Patch Changes

- Updated dependencies [[`76953e4`](https://github.com/agustinusnathaniel/xtarter/commit/76953e423f4e0c652251f6a9c4d5b3eeefa6e9b7)]:
  - @xtarterize/core@1.13.0
  - @xtarterize/patchers@1.13.0

## 1.12.0

### Minor Changes

- [`cff22ee`](https://github.com/agustinusnathaniel/xtarter/commit/cff22ee02d29c62888647e6000c919215a4a7195) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - feat: add multi-layer shebang enforcement for CLI binaries
  fix: add missing node shebang to create-xtarter-app CLI entry
  chore: add all-contributors setup

### Patch Changes

- Updated dependencies [[`cff22ee`](https://github.com/agustinusnathaniel/xtarter/commit/cff22ee02d29c62888647e6000c919215a4a7195)]:
  - @xtarterize/core@1.12.0
  - @xtarterize/patchers@1.12.0

## 1.11.0

### Minor Changes

- [`23ccade`](https://github.com/agustinusnathaniel/xtarter/commit/23ccadee1814ce6798fba4d43b09ac6a2b42bb02) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - feat: add colored tag utility and per-task spinner animation to CLI
  fix: add workspace flag to pnpm dependency installs in monorepo roots
  chore: bump build target from node18 to node20, add engines.node >=24 to packages

### Patch Changes

- Updated dependencies [[`23ccade`](https://github.com/agustinusnathaniel/xtarter/commit/23ccadee1814ce6798fba4d43b09ac6a2b42bb02)]:
  - @xtarterize/core@1.11.0
  - @xtarterize/patchers@1.11.0

## 1.10.0

### Patch Changes

- Updated dependencies [[`e68ae84`](https://github.com/agustinusnathaniel/xtarter/commit/e68ae84a8dc673547e39bd86a887a6836927b9c7)]:
  - @xtarterize/core@1.10.0
  - @xtarterize/patchers@1.10.0

## 1.9.0

### Minor Changes

- [`34ed365`](https://github.com/agustinusnathaniel/xtarter/commit/34ed3655a5f7c588f77ca9c2484a4b5894ed066c) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - feat: changeset-aware release workflow with smart node version detection

  Release workflow task now detects changeset usage and generates the appropriate workflow (changesets/action@v1 for changeset projects, tag-push for others). Smart Node.js version detection from .nvmrc and package.json engines.node, applied to all workflow templates.

### Patch Changes

- Updated dependencies [[`34ed365`](https://github.com/agustinusnathaniel/xtarter/commit/34ed3655a5f7c588f77ca9c2484a4b5894ed066c)]:
  - @xtarterize/core@1.9.0
  - @xtarterize/patchers@1.9.0

## 1.8.0

### Patch Changes

- Updated dependencies []:
  - @xtarterize/core@1.8.0
  - @xtarterize/patchers@1.8.0

## 1.7.0

### Minor Changes

- [`6b5eb96`](https://github.com/agustinusnathaniel/xtarter/commit/6b5eb961cd6196a148f7ee481474379194e2f3dd) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - refactor: extract shared YAML workflow step builder with typed step objects and automated indentation; migrate CI, release, and auto-update workflow templates to use shared helpers

  fix: replace npm-check-updates with native package manager update commands (pnpm update / npm update / yarn upgrade) followed by dedupe in the auto-update workflow

### Patch Changes

- Updated dependencies [[`b2d0b5a`](https://github.com/agustinusnathaniel/xtarter/commit/b2d0b5a35f0b79e277bf736888e5cb0b09e1409c)]:
  - @xtarterize/core@1.7.0
  - @xtarterize/patchers@1.7.0

## 1.6.1

### Patch Changes

- [`acc82f8`](https://github.com/agustinusnathaniel/xtarter/commit/acc82f8b2f1f1ee2695ac85b92b03ef5cb9d1a72) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - Internal refactoring: extract shared utilities, reorganize module structure, move deepEqual to @xtarterize/core, and rename apps/cli to apps/xtarterize.

- Updated dependencies [[`acc82f8`](https://github.com/agustinusnathaniel/xtarter/commit/acc82f8b2f1f1ee2695ac85b92b03ef5cb9d1a72)]:
  - @xtarterize/core@1.6.1
  - @xtarterize/patchers@1.6.1

## 1.6.0

### Minor Changes

- [`82e1d9f`](https://github.com/agustinusnathaniel/xtarterize/commit/82e1d9f24fd223a8f3c15c0b516c89fe5537c105) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - Improve script merging and task architecture

  - Enhance script merging logic with better conflict resolution
  - Improve task architecture for better maintainability
  - Add tests for scripts and codegen tasks
  - Update apply logic to not include conflicts by default unless explicitly requested

- [`82e1d9f`](https://github.com/agustinusnathaniel/xtarterize/commit/82e1d9f24fd223a8f3c15c0b516c89fe5537c105) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - Refactor tasks package with data-driven patterns
  - Consolidate factory into `factory/` directory with proper module structure
  - Make equivalence checks data-driven with `EquivalenceRule[]`
  - Add `factory/equivalence-data.ts` for shared equivalence rules
  - Add `factory/merger.ts` for merge operations
  - Add `factory/package-scripts.ts` for script handling
  - Add `factory/resolver.ts` for task resolution
  - Refine equivalence check for scripts
  - Update factory task, config, and utils

### Patch Changes

- [`82e1d9f`](https://github.com/agustinusnathaniel/xtarterize/commit/82e1d9f24fd223a8f3c15c0b516c89fe5537c105) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - Add ADR for pragmatic script merge strategy

  - Document the decision to use data-driven equivalence rules
  - Explain the factory consolidation approach
  - Provide rationale for script merging architecture

- [`890eab5`](https://github.com/agustinusnathaniel/xtarterize/commit/890eab57054e0b953cb42ba0884e0b2c6770bc82) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - Fix TypeScript build error for type imports

  - Add `type` modifier to `PackageScriptsMap` import in `factory/index.ts`
  - Fixes: `"PackageScriptsMap" is not exported` build error with tsdown/rolldown

- Updated dependencies [[`82e1d9f`](https://github.com/agustinusnathaniel/xtarterize/commit/82e1d9f24fd223a8f3c15c0b516c89fe5537c105), [`82e1d9f`](https://github.com/agustinusnathaniel/xtarterize/commit/82e1d9f24fd223a8f3c15c0b516c89fe5537c105)]:
  - @xtarterize/core@1.6.0
  - @xtarterize/patchers@1.6.0

## 1.5.0

### Patch Changes

- Updated dependencies []:
  - @xtarterize/core@1.5.0
  - @xtarterize/patchers@1.5.0

## 1.4.4

### Patch Changes

- Updated dependencies []:
  - @xtarterize/core@1.4.4
  - @xtarterize/patchers@1.4.4

## 1.4.3

### Patch Changes

- Updated dependencies []:
  - @xtarterize/core@1.4.3
  - @xtarterize/patchers@1.4.3

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
