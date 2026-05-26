# @xtarterize/core

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
  - **ESLint detection**: Existing ESLint setups are preserved — no lint tasks are applied
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
