# Task Reference

All available tasks, organized by group. Each task has a unique `id` used with `npx xtarterize add <id>`.

## Agent

| ID | Label | Applied when |
|----|-------|-------------|
| `agent/agents-md` | AGENTS.md | Always (creates if missing) |
| `agent/skills` | AI Skills directory | TypeScript project |
| `agent/skills-install` | Install agent skills | TypeScript project (uses `npx skills@latest`) |

## CI

| ID | Label | Applied when |
|----|-------|-------------|
| `ci/workflow` | CI workflow | `.github` directory exists |
| `ci/auto-update` | Auto-update workflow | `.github` directory exists |
| `ci/release` | Release workflow | `.github` directory exists |

## Codegen

| ID | Label | Applied when |
|----|-------|-------------|
| `codegen/plop` | Plop generators | Always |

## Dependencies

| ID | Label | Applied when |
|----|-------|-------------|
| `deps/renovate` | Renovate config | Always |

## Editor

| ID | Label | Applied when |
|----|-------|-------------|
| `editor/vscode` | VS Code settings | Always |
| `editor/editorconfig` | EditorConfig | Always |

## Lint

| ID | Label | Applied when |
|----|-------|-------------|
| `lint/biome` | Biome linting | Always |
| `lint/oxlint` | Oxlint | Not when Biome is preferred |
| `lint/oxfmt` | Oxfmt formatter | Not when Biome is preferred |

## Monorepo

| ID | Label | Applied when |
|----|-------|-------------|
| `monorepo/turbo` | Turborepo pipeline | Monorepo detected |

## Quality

| ID | Label | Applied when |
|----|-------|-------------|
| `quality/knip` | Knip (dead code) | Always |
| `quality/lint-staged` | Lint-staged | Always |

## Release

| ID | Label | Applied when |
|----|-------|-------------|
| `release/commitlint` | commitlint | Always |
| `release/czg` | czg (commitizen) | Always |
| `release/cat-version` | commit-and-tag-version | Always |
| `release/git-hooks` | Git hooks (husky) | Always |

## Scripts

| ID | Label | Applied when |
|----|-------|-------------|
| `scripts/package` | Package scripts | Always |

## TypeScript

| ID | Label | Applied when |
|----|-------|-------------|
| `ts/strict` | Strict mode | TypeScript project |
| `ts/paths` | Path aliases | TypeScript project |
| `ts/incremental` | Incremental builds | TypeScript project |
| `ts/gitignore-tsbuildinfo` | .gitignore tsbuildinfo | TypeScript project |

## Vite

| ID | Label | Applied when |
|----|-------|-------------|
| `vite/checker` | vite-plugin-checker | Vite project |
| `vite/visualizer` | rollup-plugin-visualizer | Vite project |

## Utils

| ID | Label | Applied when |
|----|-------|-------------|
| `npmrc` | .npmrc config | Always |
| `nvmrc` | .nvmrc config | Always |
