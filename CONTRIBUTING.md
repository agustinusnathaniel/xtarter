# Contributing

Thanks for your interest in contributing to xtarterize!

## Quick Start

Use Node.js 24 or later. From the repository root:

```bash
pnpm install
pnpm check
```

`pnpm check` runs type checking, builds, Ultracite checks, tests, and the
repository verification scripts.

## Project Structure

```
packages/core/      # Detection engine, task interface, utilities
packages/patchers/  # JSON/YAML merge, AST patching
packages/tasks/     # All task implementations + templates
apps/xtarterize/     # CLI entry point, commands, UI
apps/docs/          # Documentation site (Astro + Starlight)
test/               # Shared test fixtures and test suites
```

## Adding a New Task

1. Declare the task with `defineTask()` from `packages/tasks/src/factory/define-task.ts`; the `Task` contract in `packages/core/src/_base.ts` is a single interface whose methods return Effects requiring `TaskServices`
2. Create your task file in `packages/tasks/src/<category>/<task>.ts`
3. Export it from `packages/tasks/src/index.ts` and add to `getAllTasks()`
4. Add or update tests only when they provide meaningful regression protection. Extend the nearest existing suite when possible; see [`docs/TESTING.md`](docs/TESTING.md)

Each task must implement:

- `applicable(profile)` - Should this task run for this project?
- `check(cwd, profile)` - What's the current status?
- `dryRun(cwd, profile)` - What would change?
- `apply(cwd, profile)` - Make the changes
- `getDeps(cwd, profile)` - Optional packages the apply plan should install

Declare tasks with `defineTask()` from `packages/tasks/src/factory/define-task.ts`. A spec declares metadata, applicability, targets and actions, and dependencies, and resolves once so status, diffs, apply, and deps cannot disagree:

- `targets` - `text`, `jsonMerge`, `packageJson`, or `transform` targets. Each declares a filepath and how its content is computed, with an optional `policy` hook for conflict projection.
- `actions` - A status probe plus a run effect with no file diff.
- `deps` - A static list or a resolver that receives the resolved status and diffs.
- `packageJson` targets go through `factory/package-json.ts`, the only xtarterize writer of `package.json`.

`defineTask()` returns a `DefinedTask`, a `Task` whose methods return Effects requiring `TaskServices` (`ProcessRunner`). Spec functions may be synchronous, return a Promise, or return an Effect; `toTaskEffect()` normalizes those results into a single Effect at the factory seam.

## Quality Standards

- **Idempotent** - Running twice must produce the same result
- **Non-destructive** - Existing content preserved via deep merge
- **Tested** - Run the relevant existing tests and add coverage when the behavior and regression risk justify it
- **Typed** - TypeScript strict mode, no `any`
- **Formatted** - `pnpm check` (Biome) must pass

Read `docs/ADRs/` before making architectural changes, and create a new ADR if your change introduces new patterns.

## Documentation

The documentation site lives in `apps/docs`. Build it with:

```bash
pnpm docs:build
```

Use `pnpm docs:dev` for a local preview.
