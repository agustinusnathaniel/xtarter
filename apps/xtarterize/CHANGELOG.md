# xtarterize

## 1.13.5

### Patch Changes

- [`8dca764`](https://github.com/agustinusnathaniel/xtarter/commit/8dca764cb467e5efe14c130c446c43830469ac9a) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - fix(tasks): add -y flag for agent skills install

## 1.13.4

## 1.13.3

## 1.13.2

### Patch Changes

- [`746caae`](https://github.com/agustinusnathaniel/xtarter/commit/746caae9d39aa967318639418b90a684170b8047) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - fix: read version from package.json via ^ alias instead of hardcoding

## 1.13.1

### Patch Changes

- [`f1069d6`](https://github.com/agustinusnathaniel/xtarter/commit/f1069d6bea26aabece3ed030303642e1d3f14693) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - refactor: enrich oxlint and biome config templates with additional lint rules

  Add non-recommended rules mapped from typical ESLint configs:

  - Oxlint: max-params, eqeqeq, prefer-const, no-var, prefer-template, no-shadow, consistent-type-definitions, array-type, react rules, vitest overrides, unicorn relaxations, import rules
  - Biome: noExcessiveCognitiveComplexity, useMaxParams, useConsistentTypeDefinitions, useConsistentTestIt overrides

## 1.13.0

### Patch Changes

- [`813b1ea`](https://github.com/agustinusnathaniel/xtarter/commit/813b1eadecb75ba42d92b34911d968a072bbaaf6) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - refactor(diff-display): use unified diff format for all dry-run output

  Consolidates three separate renderers (full-file, hunk, semantic) into a single unified diff format (`renderHunkDiff`) for consistent git-style patch output across new, modified, and JSON files in `--dryRun` and `diff` commands.

## 1.12.0

### Minor Changes

- [`cff22ee`](https://github.com/agustinusnathaniel/xtarter/commit/cff22ee02d29c62888647e6000c919215a4a7195) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - feat: add multi-layer shebang enforcement for CLI binaries
  fix: add missing node shebang to create-xtarter-app CLI entry
  chore: add all-contributors setup

## 1.11.0

### Minor Changes

- [`23ccade`](https://github.com/agustinusnathaniel/xtarter/commit/23ccadee1814ce6798fba4d43b09ac6a2b42bb02) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - feat: add colored tag utility and per-task spinner animation to CLI
  fix: add workspace flag to pnpm dependency installs in monorepo roots
  chore: bump build target from node18 to node20, add engines.node >=24 to packages

## 1.10.0

### Minor Changes

- [`e68ae84`](https://github.com/agustinusnathaniel/xtarter/commit/e68ae84a8dc673547e39bd86a887a6836927b9c7) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - enhance diff/dry-run output with hunks, stats, and semantic JSON diffing
  - Add `DiffHunk`, `ChangeStats`, `SemanticEntry` types and optional fields on `FileDiff`
  - Add `computeChangeStats`, `computeUnifiedHunks`, `computeSemanticJsonDiff`, `enhanceDiff` core utilities
  - Add `--format` flag to `init`, `sync`, `diff`, and `add` commands (`terminal` | `json`)
  - Terminal output now shows `+N -M` change stats per file, `@@` hunk headers, and key-level semantic diffs for JSON files
  - JSON output includes structured hunks, stats, and semantic data for AI-agent consumption

## 1.9.0

## 1.8.0

### Minor Changes

- [`03231fa`](https://github.com/agustinusnathaniel/xtarter/commit/03231fa33b95f17143a7d78093c8d7cf9614e602) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - Enhanced `doctor` command with grouped output (Environment, Tools, Project, Configuration), environment and project health checks, installed tool version display, and `--verbose` flag for system information.

## 1.7.0

## 1.6.1

### Patch Changes

- [`acc82f8`](https://github.com/agustinusnathaniel/xtarter/commit/acc82f8b2f1f1ee2695ac85b92b03ef5cb9d1a72) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - Internal refactoring: extract shared utilities, reorganize module structure, move deepEqual to @xtarterize/core, and rename apps/cli to apps/xtarterize.

## 1.6.0

### Minor Changes

- [`82e1d9f`](https://github.com/agustinusnathaniel/xtarterize/commit/82e1d9f24fd223a8f3c15c0b516c89fe5537c105) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - Improve script merging and task architecture
  - Enhance script merging logic with better conflict resolution
  - Improve task architecture for better maintainability
  - Add tests for scripts and codegen tasks
  - Update apply logic to not include conflicts by default unless explicitly requested

### Patch Changes

- [`82e1d9f`](https://github.com/agustinusnathaniel/xtarterize/commit/82e1d9f24fd223a8f3c15c0b516c89fe5537c105) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - Update .gitignore

  - Add missing ignore patterns for better monorepo hygiene

- [`82e1d9f`](https://github.com/agustinusnathaniel/xtarterize/commit/82e1d9f24fd223a8f3c15c0b516c89fe5537c105) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - Refactor CLI run-command to extract seams
  - Extract god-function seams into smaller, focused functions
  - Improve code organization in `apps/cli/src/commands/run-command.ts`
  - Update init and sync commands for consistency

## 1.5.0

### Minor Changes

- [`b9d0bc6`](https://github.com/agustinusnathaniel/xtarterize/commit/b9d0bc6569bc1b653e755e1454b389c0b78d340b) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - adds a new `doctor` command with human and JSON diagnostics output, expands machine-readable JSON output support across auditing commands, and refactors CLI command internals to share preflight/runtime/spinner utilities.

  Core detection and reliability were improved by making backup index writes atomic/resilient and by improving monorepo detection for workspace package directories. Task internals were also refactored by splitting large factory helpers into smaller modules while preserving behavior.

### Patch Changes

- [`658c504`](https://github.com/agustinusnathaniel/xtarterize/commit/658c50470e462b958f0bcbc6a0eaeb92ed15acd0) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - Refactor internal architecture by deepening module seams in project detection and task execution.

  - modularize core detection into focused adapters (framework, bundler, router, styling, package manager, monorepo)
  - centralize JSON config mutation flow in shared task helpers
  - consolidate agent task behavior behind a dedicated agent module seam

  These changes improve maintainability, testability, and consistency without changing end-user CLI behavior.

## 1.4.4

### Patch Changes

- [`522509e`](https://github.com/agustinusnathaniel/xtarterize/commit/522509e8a70327d7b8c618b804ac7a4390538be7) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - Fix skills being incorrectly marked as installed when their folder is empty, causing batch installs to skip them.

## 1.4.3

### Patch Changes

- [`fb47341`](https://github.com/agustinusnathaniel/xtarterize/commit/fb47341064dd28c4d24286edccd6b60a0e767791) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - Batch skill installations by source repository to avoid redundant `npx` invocations. Skills from the same source (e.g. `expo/skills` with 8 skills) are now grouped into a single command with multiple `--skill` flags, reducing repo cloning from N times to 1 per unique source.

## 1.4.2

### Patch Changes

- [`d74c677`](https://github.com/agustinusnathaniel/xtarterize/commit/d74c677de59f9a446318fd9b61c7106a385d41a4) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - refactor: add antd, heroui, chakra-ui agent skills check

## 1.4.1

## 1.4.0

### Minor Changes

- [`52511f0`](https://github.com/agustinusnathaniel/xtarterize/commit/52511f048510f2bfdd81afccd97545eb69d1264d) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - feat: add pnpm workspace catalog for centralized dependency versions

  feat(tasks): add editorconfig, npmrc, nvmrc, lint-staged, and git hooks tasks

  refactor(factory): add depCondition option and dynamic filepath support to PackageJsonTask

### Patch Changes

- [`52511f0`](https://github.com/agustinusnathaniel/xtarterize/commit/52511f048510f2bfdd81afccd97545eb69d1264d) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - fix(tasks): exclude .agents and .claude dirs from Biome file includes

  fix(tasks): make knip task applicable to all projects with format-aware config

  fix(tasks): replace non-null assertions with type-safe depName guards

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

## 1.2.1

### Patch Changes

- [`d561f32`](https://github.com/agustinusnathaniel/xtarterize/commit/d561f325a596cb7dd026a894d83296d13c3e5eec) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - fix(tasks): inherit stdio in skills-install for visible progress

## 1.2.0

### Minor Changes

- [`ccd9287`](https://github.com/agustinusnathaniel/xtarterize/commit/ccd9287afd967ed1ea0ef0c64b4a4a468e95b550) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - feat: merge duplicate JSON file diffs in CLI output

  The `diff` command and `init --dry-run` now group multiple task diffs targeting the same JSON file into a single unified diff. Previously, independent tasks like `ts/incremental`, `ts/paths`, and `ts/strict` each produced a separate `FileDiff` for `tsconfig.json`, resulting in overlapping and confusing output.

  Now, diffs are grouped by `filepath` and merged using `patchJson` so the user sees the complete intended state of each file in one view.

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

## 1.1.1

### Patch Changes

- [`04b6ce4`](https://github.com/agustinusnathaniel/xtarterize/commit/04b6ce4126dca549992b12f15913b71d740d50ef) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - extract plop templates to .hbs files

## 1.1.0

### Minor Changes

- [`e230c41`](https://github.com/agustinusnathaniel/xtarterize/commit/e230c411c4b04cfdd942bc5d3f1d89f2e289e02c) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - adds automatic agent skills installation based on your stack, fixes the --cwd flag to actually work, renders the conformance plan and dry-run output as proper tables, and improves framework-aware config generation across Biome, Plop, and CI workflows.

## 1.0.1

### Patch Changes

- [`13b4eb7`](https://github.com/agustinusnathaniel/xtarterize/commit/13b4eb78fcd7b57525c3605fc7b68682bb0250d0) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - polishing and ironing

## 1.0.0

### Major Changes

- [`09cfc08`](https://github.com/agustinusnathaniel/xtarterize/commit/09cfc08ed19b6a7246acb8e0320ae50fb270f57c) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - 1.0 Release
