# @xtarterize/core

## 1.16.2

### Patch Changes

- [#78](https://github.com/agustinusnathaniel/xtarter/pull/78) [`f5c701b`](https://github.com/agustinusnathaniel/xtarter/commit/f5c701bd4d29a33b9f168e71334b950183ea034a) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - Fix task status resolution not to abort on first failure; surface check/dryRun errors in ApplyResult; fix Node engine version range parsing in doctor

## 1.16.1

## 1.16.0

### Minor Changes

- [#75](https://github.com/agustinusnathaniel/xtarter/pull/75) [`be651f3`](https://github.com/agustinusnathaniel/xtarter/commit/be651f3aa5e6bac9098fc145fd0a3651f7b4fbbb) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - feat: add natural language task query engine with `query` command and `init --compose`

  New features:

  - `xtarterize query <query>` - search and discover tasks using natural language with a pure-algorithmic scoring engine
  - `xtarterize init --compose <query>` - compose a targeted task plan by ranking tasks by relevance
  - Task metadata enrichment: new optional `searchMeta` field on the Task interface with `tags`, `configTargets`, and `keywords` supports richer search results
  - All 26 built-in tasks now include search metadata
  - Query output redesigned with domain-bundle grouping, compact one-liners, and per-group actionable add commands
  - Scoring optimized: per-token best match across synonyms eliminates dilution from low-scoring expanded terms
  - Query command runs standalone without requiring project context (package.json)
  - Hyphenated queries ("agent-skills") match spaced terms ("agent skills") via hyphen normalization
  - Input validation hardening and edge case fixes

## 1.15.2

### Patch Changes

- [#73](https://github.com/agustinusnathaniel/xtarter/pull/73) [`aec3c0a`](https://github.com/agustinusnathaniel/xtarter/commit/aec3c0a4d289c5984183d738d99727555b84c602) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - Refactor task resolution with TaskScope system for monorepo-aware task filtering

  Introduces a `TaskScope` type (`'root' | 'package' | 'both'`) that each task can declare. When running in a monorepo:

  - **Root-scoped tasks** (CI/CD, release tooling, turbo, renovate, editor config, npmrc, gitignore, package scripts) are excluded when running inside a workspace package.
  - **Package-scoped tasks** (tsconfig path aliases, vite-plugin-checker, rollup-plugin-visualizer) are excluded when running from the monorepo root.
  - Tasks without explicit scope (or with `scope: 'both'`) are included everywhere, preserving backward compatibility.

  Also fixes runtime detection so Node.js projects using Vite for build orchestration are correctly identified as `runtime: 'node'` instead of `runtime: 'browser'`.

## 1.15.1

### Patch Changes

- [`3c68470`](https://github.com/agustinusnathaniel/xtarter/commit/3c684707e7b252dfc5da8c1fc4496436efa40331) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - fix: make profile cache write resilient to concurrent cleanup

  The `writeProfileCache` function now re-creates the cache directory before
  rename, preventing ENOENT errors when parallel processes clean up the
  `.xtarterize/cache` directory between steps.

## 1.15.0

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
  - **CLI** - try/catch guards on `init`, `sync`, `diff`, `add`, `doctor`, and `restore` prevent crashes from individual task failures; `--skip`/`--only` no longer matches phantom empty-string values; `doctor` uses `Promise.allSettled` for resilient diagnostics
  - **Core** - robust atomic writes with temp file cleanup on failure; schema validation guards against corrupted cache entries; fixed React Native + React co-detection; skipped count now correctly tracks explicit skips from check phase
  - **Tasks** - fixed `this.getScripts` undefined crash in `packageScriptsTask`; `commitMsgHook` accepts a package manager parameter instead of hardcoding pnpm; corrected `check()` status detection for `conflict` vs `new`
  - **UI** - merged multi-diff preserves earlier diffs instead of dropping them; JSON `ok` field reflects actual conformance state; multiselect cancel properly aborts
  - **Documentation** - outdated content refreshed (Node.js minimum bumped to 24, missing CLI flags documented, task applicability corrected, path fixes)

## 1.14.1

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

### Patch Changes

- [#51](https://github.com/agustinusnathaniel/xtarter/pull/51) [`dc722ea`](https://github.com/agustinusnathaniel/xtarter/commit/dc722ead5f376e26c217c97cfffc8102a967819a) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - refactor: add fingerprint-based caching to detectProject

  Wraps detectProject with a best-effort cache keyed on project state
  fingerprints. Cache hit <1ms vs ~50-150ms for full detection.

## 1.13.9

## 1.13.8

### Patch Changes

- [#48](https://github.com/agustinusnathaniel/xtarter/pull/48) [`825df7b`](https://github.com/agustinusnathaniel/xtarter/commit/825df7bd746aa186c9196586227474fd932c3394) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - Re-include ultracite for Biome and Oxlint & Oxfmt task for more consistent configurations.

## 1.13.7

### Patch Changes

- [#46](https://github.com/agustinusnathaniel/xtarter/pull/46) [`5706e0b`](https://github.com/agustinusnathaniel/xtarter/commit/5706e0b1da60b4ed7763d9b3ae7a1862baa49841) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - adopt Effect TS v4 for internal error handling and workflow composition

  **Why Effect v4.**

  The project's async workflows had ad-hoc error handling - `try/catch` with
  `new Error(String(cause))` that lost error type context, couldn't distinguish
  error kinds at the type level, and made it impossible to pattern-match on
  failures. Effect v4 provides `Data.TaggedError` (discriminated unions that
  extend `Error`), `Effect.tryPromise` (typed promise wrapping), `Effect.gen`
  (ergonomic generator-based composition), and `Effect.all` (structured
  concurrency with error aggregation).

  **Approach: boundary pattern, not full migration.**

  Rather than making every function return `Effect<A, E>` (which would require
  all callers to understand Effect), we apply Effect at two levels:

  1. **Internal composition** - async workflows use `Effect.gen` + `yield*`,
     `Effect.all` for concurrency, and `Effect.tryPromise` with typed error
     handlers. This gives us structured error handling without changing
     how consumers call the library.
  2. **Promise boundary** - all public API signatures remain `Promise<T>`.
     `Effect.runPromise` unwraps at the function boundary. Tests require zero
     changes.

  **What changed (26 files, +1857/-1571):**

  Tagged errors and Effect composition:

  - `packages/core/src/errors.ts` (new) - consolidated `Data.TaggedError`
    types: `FileSystemError` (read/write/parse failures), `BackupError`
    (backup operations), `TaskError` (task check/apply failures)
  - `packages/core/src/utils/fs.ts` - every FS operation wraps with
    `Effect.tryPromise` catching as `FileSystemError` instead of generic
    `new Error(String(cause))`
  - `packages/core/src/backup.ts` - backup workflow uses `Effect.gen` for
    sequential steps (access → mkdir → cp → read/write index) with
    `BackupError` typing and atomic index writes
  - `packages/core/src/diagnostics.ts` - parallel checks via `Effect.all`,
    tool execution with `FileSystemError`, all `tryEffect` helpers upgraded
    to tagged errors; exported `tryReadPackageJson` to eliminate 4 copies
    of the null-guard pattern
  - `packages/core/src/preflight.ts` - validation orchestration via
    `Effect.gen` with `FileSystemError`; deduplicated `tryEffect` by
    importing from diagnostics
  - `packages/core/src/resolve.ts` - concurrent task status checks via
    `Effect.all`
  - `packages/core/src/apply.ts` - per-task error handling with `TaskError`,
    same-name tasks continue after failures
  - `packages/core/src/utils/deep-equal.ts` - custom recursion replaced
    with `Equal.equals` from Effect

  Reducing Effect ceremony:

  - `packages/tasks/src/factory/ops.ts` - added `wrapTask(taskId, method, fn)`
    internal helper collapsing the 6-line `Effect.runPromise(Effect.tryPromise)`
    pattern into 1 line
  - `packages/tasks/src/factory/index.ts` - replaced 15 Effect wrappers,
    removed `Effect` import
  - `packages/tasks/src/factory/task.ts` - replaced 3 wrappers, removed
    `Effect` and `TaskError` imports
  - `packages/tasks/src/agent/skills-install.ts` - replaced 3 wrappers,
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

## 1.13.5

## 1.13.4

## 1.13.3

## 1.13.2

## 1.13.1

## 1.13.0

### Minor Changes

- [#31](https://github.com/agustinusnathaniel/xtarter/pull/31) [`76953e4`](https://github.com/agustinusnathaniel/xtarter/commit/76953e423f4e0c652251f6a9c4d5b3eeefa6e9b7) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - feat: add oxlint and oxfmt support with Vite+ auto-detection

  When Vite+ is detected, xtarterize now configures oxlint/oxfmt (via `vp`) instead of Biome as the default linting/formatting stack:

  - **Scripts**: `vp lint` / `vp check` / `vp check --fix` for Vite+ projects (instead of `biome check .` / `biome check --write .`)
  - **Config**: `.oxlintrc.json` (with `consistent-type-imports`, `import/order`, `no-console` rules) and `.oxfmtrc.json` for Vite+ projects
  - **Standalone oxlint**: Direct `oxlint`/`oxfmt` commands when oxlint/oxfmt config exists without Vite+
  - **ESLint detection**: Existing ESLint setups are preserved - no lint tasks are applied
  - **CI**: Single `vp check` step for Vite+ projects (handles fmt + lint + typecheck)
  - **Lint-staged**: Skipped for Vite+ projects (uses `vp staged` via git hooks)
  - **Biome**: Config still generated for IDE fallback, but scripts point to `vp` when Vite+ is present

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

### Minor Changes

- [`34ed365`](https://github.com/agustinusnathaniel/xtarter/commit/34ed3655a5f7c588f77ca9c2484a4b5894ed066c) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - feat: changeset-aware release workflow with smart node version detection

  Release workflow task now detects changeset usage and generates the appropriate workflow (changesets/action@v1 for changeset projects, tag-push for others). Smart Node.js version detection from .nvmrc and package.json engines.node, applied to all workflow templates.

## 1.8.0

## 1.7.0

### Minor Changes

- [`b2d0b5a`](https://github.com/agustinusnathaniel/xtarter/commit/b2d0b5a35f0b79e277bf736888e5cb0b09e1409c) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - feat: add shared CLI utilities (abortIfCancelled, createSpinner, isCI) and re-export consola from core for use by xtarterize and create-xtarter-app apps

## 1.6.1

### Patch Changes

- [`acc82f8`](https://github.com/agustinusnathaniel/xtarter/commit/acc82f8b2f1f1ee2695ac85b92b03ef5cb9d1a72) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - Internal refactoring: extract shared utilities, reorganize module structure, move deepEqual to @xtarterize/core, and rename apps/cli to apps/xtarterize.

## 1.6.0

### Patch Changes

- [`82e1d9f`](https://github.com/agustinusnathaniel/xtarterize/commit/82e1d9f24fd223a8f3c15c0b516c89fe5537c105) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - Improve script merging and task architecture

  - Enhance script merging logic with better conflict resolution
  - Improve task architecture for better maintainability
  - Add tests for scripts and codegen tasks
  - Update apply logic to not include conflicts by default unless explicitly requested

- [`82e1d9f`](https://github.com/agustinusnathaniel/xtarterize/commit/82e1d9f24fd223a8f3c15c0b516c89fe5537c105) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - Refactor `detectExistingConfigs` to be data-driven with `ConfigDetector[]`
  - Add `ConfigDetector` type mapping to keys in `ProjectProfile['existing']`
  - Implement individual detector functions for biome, tsconfig, renovate, commitlint, knip, plop, turbo, vscode, agents, github workflows, vite, versionrc, gitignore
  - Replace imperative detection logic with declarative detector array

## 1.5.0

## 1.4.4

## 1.4.3

## 1.4.2

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

## 1.2.0

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

## 1.1.0

## 1.0.1

## 1.0.0
