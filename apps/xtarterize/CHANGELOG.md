# xtarterize

## 1.14.4

### Patch Changes

- [`ec142cb`](https://github.com/agustinusnathaniel/xtarter/commit/ec142cbb6e48297f6b12a4729676f283d8a0537d) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - fix: handle package install failures gracefully and fix CI test stability

  - installDependency now catches nypm errors and logs a warning instead of
    throwing, preventing package install failures from blocking config
    modifications
  - doctor --verbose now correctly overrides CI-forced quiet mode
  - Explicit turbo dependencies ensure build outputs exist before tests run
  - Increase test timeouts for slow pnpm installs in CI

## 1.14.3

### Patch Changes

- [`0941ef3`](https://github.com/agustinusnathaniel/xtarter/commit/0941ef3e1dd9a3eb31ba031c201b0d36a33995b4) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - fix: correct broken skill references in agent skill catalog
  fix: git hooks now work on npm, yarn, and bun package managers
  fix: engines.node raised to >=24 for clear error on unsupported Node versions
  fix: resolve backup filename collision that could cause silent data loss
  fix: add path traversal validation to backup restore for security hardening
  fix: align Vite plugin dryRun output with apply output for reliable diffs
  fix: improve detection cache fingerprint to detect config file changes

## 1.14.2

### Patch Changes

- [`c637a36`](https://github.com/agustinusnathaniel/xtarter/commit/c637a3686e1c32e5a0cb658c2030201dcb5c32b1) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - Edge-case hardening across CLI, core, tasks, and UI layers:

  - **CLI** — try/catch guards on `init`, `sync`, `diff`, `add`, `doctor`, and `restore` prevent crashes from individual task failures; `--skip`/`--only` no longer matches phantom empty-string values; `doctor` uses `Promise.allSettled` for resilient diagnostics
  - **Core** — robust atomic writes with temp file cleanup on failure; schema validation guards against corrupted cache entries; fixed React Native + React co-detection; skipped count now correctly tracks explicit skips from check phase
  - **Tasks** — fixed `this.getScripts` undefined crash in `packageScriptsTask`; `commitMsgHook` accepts a package manager parameter instead of hardcoding pnpm; corrected `check()` status detection for `conflict` vs `new`
  - **UI** — merged multi-diff preserves earlier diffs instead of dropping them; JSON `ok` field reflects actual conformance state; multiselect cancel properly aborts
  - **Documentation** — outdated content refreshed (Node.js minimum bumped to 24, missing CLI flags documented, task applicability corrected, path fixes)

## 1.14.1

### Patch Changes

- [`f805556`](https://github.com/agustinusnathaniel/xtarter/commit/f805556aa43083099883c7561fb72df8592176a6) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - fix(add): make taskId positional arg optional

  `xtarterize add` without a task ID now enters interactive mode directly instead of requiring a task ID or empty string.

## 1.14.0

### Minor Changes

- [`7ddedae`](https://github.com/agustinusnathaniel/xtarter/commit/7ddedaeda4360653ba8bb959e2d9a6164741c17d) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - feat: add undo command, interactive add, and conformance badge

  - `xtarterize undo` reverts the last run by restoring all backed-up files in one command
  - `xtarterize add` without a task ID shows a grouped multi-select menu for interactive task selection
  - `xtarterize check --badge <path>` generates an SVG conformance badge
  - Add RunManifest type and writeRunManifest/readRunManifest/listAllBackups to core backup module

## 1.13.11

### Patch Changes

- [#53](https://github.com/agustinusnathaniel/xtarter/pull/53) [`e6ee639`](https://github.com/agustinusnathaniel/xtarter/commit/e6ee639237787260dd13616bc45c0482851e5437) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - refactor: add per-command timing instrumentation

  Adds timing measurement for each phase of command execution (detection,
  resolution, apply) with per-task breakdown available via the new `--timing`
  global flag. Timing summary is displayed at the end of every command in
  terminal output, and included in JSON output for `--json` mode.

## 1.13.10

## 1.13.9

## 1.13.8

## 1.13.7

### Patch Changes

- [#46](https://github.com/agustinusnathaniel/xtarter/pull/46) [`5706e0b`](https://github.com/agustinusnathaniel/xtarter/commit/5706e0b1da60b4ed7763d9b3ae7a1862baa49841) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - adopt Effect TS v4 for internal error handling and workflow composition

  **Why Effect v4.**

  The project's async workflows had ad-hoc error handling — `try/catch` with
  `new Error(String(cause))` that lost error type context, couldn't distinguish
  error kinds at the type level, and made it impossible to pattern-match on
  failures. Effect v4 provides `Data.TaggedError` (discriminated unions that
  extend `Error`), `Effect.tryPromise` (typed promise wrapping), `Effect.gen`
  (ergonomic generator-based composition), and `Effect.all` (structured
  concurrency with error aggregation).

  **Approach: boundary pattern, not full migration.**

  Rather than making every function return `Effect<A, E>` (which would require
  all callers to understand Effect), we apply Effect at two levels:

  1. **Internal composition** — async workflows use `Effect.gen` + `yield*`,
     `Effect.all` for concurrency, and `Effect.tryPromise` with typed error
     handlers. This gives us structured error handling without changing
     how consumers call the library.
  2. **Promise boundary** — all public API signatures remain `Promise<T>`.
     `Effect.runPromise` unwraps at the function boundary. Tests require zero
     changes.

  **What changed (26 files, +1857/-1571):**

  Tagged errors and Effect composition:

  - `packages/core/src/errors.ts` (new) — consolidated `Data.TaggedError`
    types: `FileSystemError` (read/write/parse failures), `BackupError`
    (backup operations), `TaskError` (task check/apply failures)
  - `packages/core/src/utils/fs.ts` — every FS operation wraps with
    `Effect.tryPromise` catching as `FileSystemError` instead of generic
    `new Error(String(cause))`
  - `packages/core/src/backup.ts` — backup workflow uses `Effect.gen` for
    sequential steps (access → mkdir → cp → read/write index) with
    `BackupError` typing and atomic index writes
  - `packages/core/src/diagnostics.ts` — parallel checks via `Effect.all`,
    tool execution with `FileSystemError`, all `tryEffect` helpers upgraded
    to tagged errors; exported `tryReadPackageJson` to eliminate 4 copies
    of the null-guard pattern
  - `packages/core/src/preflight.ts` — validation orchestration via
    `Effect.gen` with `FileSystemError`; deduplicated `tryEffect` by
    importing from diagnostics
  - `packages/core/src/resolve.ts` — concurrent task status checks via
    `Effect.all`
  - `packages/core/src/apply.ts` — per-task error handling with `TaskError`,
    same-name tasks continue after failures
  - `packages/core/src/utils/deep-equal.ts` — custom recursion replaced
    with `Equal.equals` from Effect

  Reducing Effect ceremony:

  - `packages/tasks/src/factory/ops.ts` — added `wrapTask(taskId, method, fn)`
    internal helper collapsing the 6-line `Effect.runPromise(Effect.tryPromise)`
    pattern into 1 line
  - `packages/tasks/src/factory/index.ts` — replaced 15 Effect wrappers,
    removed `Effect` import
  - `packages/tasks/src/factory/task.ts` — replaced 3 wrappers, removed
    `Effect` and `TaskError` imports
  - `packages/tasks/src/agent/skills-install.ts` — replaced 3 wrappers,
    removed `Effect` import, fixed hardcoded task IDs in error metadata

  **Trade-offs.**

  - Added Effect v4 beta as a dependency (~44 MB install size, 10 transitive
    deps). Beta stability risk is mitigated by pinning the exact version in
    `pnpm-workspace.yaml` catalog.
  - The initial adoption introduced `Effect.tryPromise` ceremony at every
    call site; subsequent consolidation via `wrapTask` collapsed 21 such
    wrappers into a single 8-line helper, removing the `Effect` import from
    all task factory files.

  **Verification.**

  All 323 existing tests pass unchanged. `Effect.runPromise` at each function
  boundary ensures the Promise-based public API is preserved.

## 1.13.6

### Patch Changes

- [`e65b98c`](https://github.com/agustinusnathaniel/xtarter/commit/e65b98c57b3a640365d867befb0e551769841b70) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - Remove redundant default values from biome.json and .oxfmtrc.json templates (formatter.enabled, linter.enabled, semicolons, trailingComma, etc.)

  Add type-safe config interfaces: generated Configuration type from @biomejs/biome schema, upstream OxlintConfig/OxlintEnv types, and local OxfmtConfig type

  Switch commitlint.config.ts output from JSDoc @type to import type { UserConfig }

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
