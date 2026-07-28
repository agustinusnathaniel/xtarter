# Contributing

Thanks for your interest in contributing to xtarterize!

## Quick Start

```bash
pnpm install
pnpm build
pnpm test
```

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

1. Implement the `Task` interface from `packages/core/src/_base.ts`
2. Create your task file in `packages/tasks/src/<category>/<task>.ts`
3. Export it from `packages/tasks/src/index.ts` and add to `getAllTasks()`
4. Add tests in `test/tasks/`

Each task must implement:

- `applicable(profile)` - Should this task run for this project?
- `check(cwd, profile)` - What's the current status?
- `dryRun(cwd, profile)` - What would change?
- `apply(cwd, profile)` - Make the changes

Use the factory functions in `packages/tasks/src/factory/`:

- `createFileTask` - For files with creation and check logic
- `createMultiFileTask` - For tasks producing multiple files
- `createJsonMergeTask` - For JSON config files that should merge
- `createMultiFileJsonMergeTask` - For tasks that merge multiple JSON configs
- `createPackageJsonTask` - For package.json scripts + deps
- `createExecTask` - For tasks that run shell commands
- `createVitePluginTask` - For vite.config plugin injection

## Quality Standards

- **Idempotent** - Running twice must produce the same result
- **Non-destructive** - Existing content preserved via deep merge
- **Tested** - Add or update tests in `test/` for new behavior
- **Typed** - TypeScript strict mode, no `any`
- **Formatted** - `pnpm check` (Biome) must pass

Read `docs/ADRs/` before making architectural changes, and create a new ADR if your change introduces new patterns.
