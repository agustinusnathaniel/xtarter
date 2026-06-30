# @xtarterize/patchers

## 1.16.1

## 1.16.0

### Minor Changes

- [#75](https://github.com/agustinusnathaniel/xtarter/pull/75) [`be651f3`](https://github.com/agustinusnathaniel/xtarter/commit/be651f3aa5e6bac9098fc145fd0a3651f7b4fbbb) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - feat: add natural language task query engine with `query` command and `init --compose`

  New features:

  - `xtarterize query <query>` — search and discover tasks using natural language with a pure-algorithmic scoring engine
  - `xtarterize init --compose <query>` — compose a targeted task plan by ranking tasks by relevance
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

## 1.15.0

## 1.14.4

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

## 1.14.0

## 1.13.11

## 1.13.10

## 1.13.9

## 1.13.8

## 1.13.7

## 1.13.6

## 1.13.5

## 1.13.4

## 1.13.3

## 1.13.2

## 1.13.1

## 1.13.0

## 1.12.0

### Minor Changes

- [`cff22ee`](https://github.com/agustinusnathaniel/xtarter/commit/cff22ee02d29c62888647e6000c919215a4a7195) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - feat: add multi-layer shebang enforcement for CLI binaries
  fix: add missing node shebang to create-xtarter-app CLI entry
  chore: add all-contributors setup

## 1.11.0

## 1.10.0

## 1.9.0

## 1.8.0

## 1.7.0

## 1.6.1

### Patch Changes

- [`acc82f8`](https://github.com/agustinusnathaniel/xtarter/commit/acc82f8b2f1f1ee2695ac85b92b03ef5cb9d1a72) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - Internal refactoring: extract shared utilities, reorganize module structure, move deepEqual to @xtarterize/core, and rename apps/cli to apps/xtarterize.

## 1.6.0

## 1.5.0

## 1.4.4

## 1.4.3

## 1.4.2

## 1.4.1

### Patch Changes

- [`5f5fe9a`](https://github.com/agustinusnathaniel/xtarterize/commit/5f5fe9a2df17274a71afcb853cba4e684c0499ec) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - fix: use JSON5 parser in patchJson to handle JSONC comments

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

### Minor Changes

- [`ccd9287`](https://github.com/agustinusnathaniel/xtarterize/commit/ccd9287afd967ed1ea0ef0c64b4a4a468e95b550) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - feat: add `patchJson` for surgical JSON text edits using `jsonc-parser`

  Replaced `JSON.stringify(mergeJson(...), null, 2)` with `patchJson`, which performs byte-level text edits via Microsoft's [`jsonc-parser`](https://github.com/microsoft/node-jsonc-parser). This preserves:

  - Comments (`// inline` and `/* block */`)
  - Key ordering
  - Whitespace and indentation style
  - Trailing commas (in JSONC)

  Applies to all JSON config tasks: `createJsonMergeTask`, `createMultiFileJsonMergeTask`, and `createPackageJsonTask`.

  **BREAKING CHANGE for consumers:** `@xtarterize/patchers` now requires `jsonc-parser` as a runtime dependency. The CLI bundler marks it as `neverBundle` to avoid inline bundling issues.

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
