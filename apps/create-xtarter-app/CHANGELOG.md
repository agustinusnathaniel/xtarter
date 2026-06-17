# Changelog

## 1.14.1

### Patch Changes

- [`c637a36`](https://github.com/agustinusnathaniel/xtarter/commit/c637a3686e1c32e5a0cb658c2030201dcb5c32b1) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - Edge-case fixes for project scaffolding:

  - Windows-compatible path handling (use `basename()` instead of `split('/')`)
  - Fixed pnpm overrides crash with type-check before `.includes()` call
  - Async `readdir` from `fs/promises` replaces sync `readdirSync`
  - Improved project name sanitization (collapse consecutive hyphens, trim leading/trailing)
  - Handle explicit `false` values from CLI flags in prompt functions
  - Runtime validation of `packageManager` in `installDependencies`
  - Removed dead code referencing already-deleted `.github` directory

## 1.14.0

### Minor Changes

- [#56](https://github.com/agustinusnathaniel/xtarter/pull/56) [`e973326`](https://github.com/agustinusnathaniel/xtarter/commit/e973326f9dd96e9a3e9f483fd35c5d177d0858ac) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - feat: add --force, --ref flags, cwd scaffold, better --yes behavior, and error recovery

  - New `--force` / `-f` flag overwrites existing directories
  - New `--ref` flag pins template version to a git ref
  - `create-xtarter-app .` scaffolds into current directory
  - `--yes` no longer overrides explicit flags like `--pm bun`
  - Partial scaffold failures clean up created directories
  - Banner alignment fixed (was off by 2-4 chars per line)

## 1.13.6

### Patch Changes

- [`e65b98c`](https://github.com/agustinusnathaniel/xtarter/commit/e65b98c57b3a640365d867befb0e551769841b70) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - Remove redundant default values from biome.json and .oxfmtrc.json templates (formatter.enabled, linter.enabled, semicolons, trailingComma, etc.)

  Add type-safe config interfaces: generated Configuration type from @biomejs/biome schema, upstream OxlintConfig/OxlintEnv types, and local OxfmtConfig type

  Switch commitlint.config.ts output from JSDoc @type to import type { UserConfig }

## 1.13.5

## 1.13.4

## 1.13.3

### Patch Changes

- [`4c70cbb`](https://github.com/agustinusnathaniel/xtarter/commit/4c70cbbf37687beb6ea6b139d04a430a5870f3e7) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - update template description

## 1.13.2

### Patch Changes

- [`746caae`](https://github.com/agustinusnathaniel/xtarter/commit/746caae9d39aa967318639418b90a684170b8047) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - fix: read version from package.json via ^ alias instead of hardcoding

## 1.13.1

## 1.13.0

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

## 1.9.0

## 1.2.1

### Patch Changes

- [`b2d0b5a`](https://github.com/agustinusnathaniel/xtarter/commit/b2d0b5a35f0b79e277bf736888e5cb0b09e1409c) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - refactor: migrate to use @xtarterize/core CLI utilities and citty subcommands; remove direct consola dependency

## 1.2.0

### Minor Changes

- [#21](https://github.com/agustinusnathaniel/xtarter/pull/21) [`b2bf637`](https://github.com/agustinusnathaniel/xtarter/commit/b2bf637f0625c1d3e350d6823ac424f80f6a7f9f) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - Migrate into xtarterize monorepo: adopt changesets for versioning, biome for formatting, and pnpm workspace catalog for dependencies. Drop ultracite and commit-and-tag-version.

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## 1.1.0 (2026-03-31)

### Features

- add tests, --yes flag, error recovery, and template preview ([61ce7c5](https://github.com/agustinusnathaniel/create-xtarter-app/commit/61ce7c5a7f0d73517fa58fd6f907d0158e03f6fa))

### Bug Fixes

- resolve all pnpm fix issues ([f7eeaa8](https://github.com/agustinusnathaniel/create-xtarter-app/commit/f7eeaa85918516d57add132875fe43ac8ba6ac7f))
- type check ([d298a2d](https://github.com/agustinusnathaniel/create-xtarter-app/commit/d298a2d0fc0dca9aec791c6158dffe57a81a8b31))

## [1.0.2](https://github.com/agustinusnathaniel/create-xtarter-app/compare/v1.0.1...v1.0.2) (2026-03-31)

## [1.0.1](https://github.com/agustinusnathaniel/create-xtarter-app/compare/v1.0.0...v1.0.1) (2026-03-30)

## 1.0.0 (2026-03-30)

### Features

- add tests, --yes flag, error recovery, and template preview ([61ce7c5](https://github.com/agustinusnathaniel/create-xtarter-app/commit/61ce7c5a7f0d73517fa58fd6f907d0158e03f6fa))

### Bug Fixes

- resolve all pnpm fix issues ([f7eeaa8](https://github.com/agustinusnathaniel/create-xtarter-app/commit/f7eeaa85918516d57add132875fe43ac8ba6ac7f))
