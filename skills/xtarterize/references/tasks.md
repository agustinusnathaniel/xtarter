# Task Reference

All available tasks, organized by group. Each task has a unique `id` used with `npx xtarterize add <id>`.

## Agent

| ID | Label | Applied when |
|----|-------|-------------|
| `agent/agents-md` | AGENTS.md | Always (creates if missing) |
| `agent/skills-install` | Install agent skills | TypeScript project (uses `npx skills@latest`) |

## CI

| ID | Label | Applied when |
|----|-------|-------------|
| `ci/ci` | CI workflow | `.github` directory exists |
| `ci/auto-update` | Auto-update workflow | `.github` directory exists |
| `ci/release` | Release workflow | `.github` directory exists |

## Codegen

| ID | Label | Applied when |
|----|-------|-------------|
| `codegen/plop` | Plop generators | Framework detected |

## Dependencies

| ID | Label | Applied when |
|----|-------|-------------|
| `deps/renovate` | Renovate config | GitHub detected |

## Editor

| ID | Label | Applied when |
|----|-------|-------------|
| `editor/vscode` | VS Code settings | Always |

## Lint

| ID | Label | Applied when |
|----|-------|-------------|
| `lint/biome` | Biome linting | No ESLint, Oxlint, or Oxfmt; non-Vite+ or existing Biome |
| `lint/oxlint` | Oxlint | Vite+ or existing Oxlint, with no ESLint or Biome |
| `lint/oxfmt` | Oxfmt formatter | Vite+ or existing Oxfmt, with no ESLint or Biome |

## Monorepo

| ID | Label | Applied when |
|----|-------|-------------|
| `monorepo/turbo` | Turborepo pipeline | Turborepo detected or `turbo.json` exists |

## Quality

| ID | Label | Applied when |
|----|-------|-------------|
| `quality/knip` | Knip (dead code) | Always |
| `quality/lint-staged` | Lint-staged | Non-Vite+ project |
| `quality/package-engines` | devEngines in package.json | Always |

## Release

| ID | Label | Applied when |
|----|-------|-------------|
| `release/commitlint` | commitlint | Always |
| `release/czg` | czg (commitizen) | Always |
| `release/cat-version` | commit-and-tag-version | Always |
| `release/git-hooks` | Git hooks (husky) | Always |
| `release/versionrc` | .versionrc config | Always |

## Scripts

| ID | Label | Applied when |
|----|-------|-------------|
| `scripts/package-scripts` | Package scripts | Always |
| `scripts/npmrc` | .npmrc config | Always |

## TypeScript

| ID | Label | Applied when |
|----|-------|-------------|
| `ts/strict` | Strict mode | TypeScript project |
| `ts/paths` | Path aliases | TypeScript project |
| `ts/incremental` | Incremental builds | TypeScript project |
| `gitignore/tsbuildinfo` | .gitignore tsbuildinfo | TypeScript project |

## Vite

| ID | Label | Applied when |
|----|-------|-------------|
| `vite/checker` | vite-plugin-checker | Vite project |
| `vite/visualizer` | rollup-plugin-visualizer | Vite project |

## Workspace

| ID | Label | Applied when |
|----|-------|-------------|
| `workspace/pnpm-workspace` | pnpm-workspace.yaml | pnpm project; monorepos receive `apps/*` and `packages/*` globs |
