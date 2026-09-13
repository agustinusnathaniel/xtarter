# xtarterize

> Apply conformance configuration to JavaScript and TypeScript projects

[![npm version](https://img.shields.io/npm/v/xtarterize.svg)](https://www.npmjs.com/package/xtarterize)
[![npm downloads](https://img.shields.io/npm/dm/xtarterize.svg)](https://www.npmjs.com/package/xtarterize)
[![License](https://img.shields.io/npm/l/xtarterize.svg)](https://github.com/agustinusnathaniel/xtarterize/blob/main/LICENSE)

`xtarterize` detects a project's stack, selects applicable configuration tasks,
previews changes, and applies approved updates. Existing values are preserved
by default; incompatible values are reported as conflicts.

## Requirements

Requires Node.js 24+, a `package.json` with a `name` field, and an initialized
Git repository.

## Quick start

```bash
npx xtarterize diff          # Preview changes
npx xtarterize init          # Review and apply changes
npx xtarterize check --quiet # Verify later (CI-safe)
```

Use `npx xtarterize init --yes` to apply all applicable non-conflicting tasks
without prompts. Use `--format json` or `--json` for machine-readable output.

## Commands

| Command | Purpose |
| --- | --- |
| `init` | Detect, preview, and apply applicable tasks |
| `sync` | Update existing configurations |
| `diff` | Preview pending changes without writing |
| `check` | Audit task status and diagnostics |
| `add [task-id]` | Apply one task or choose tasks interactively |
| `list` | List tasks and their status |
| `query <query>` | Search tasks with natural language |
| `doctor` | Run environment and project diagnostics |
| `undo` | Restore the most recent run |
| `restore <file>` | Restore one file from backup |

See the [CLI reference](https://xtarter.sznm.dev/xtarterize/guide/cli/overview/)
for command options, exit codes, and JSON output shapes.

## Supported stacks

xtarterize detects React, React Native, Vue, Svelte, Solid, and Node.js projects;
Vite, Next.js, Expo, TanStack Start, Webpack, and Rspack bundlers; common CSS
solutions; and pnpm, npm, yarn, and bun package managers, with the deepest
coverage for Vite, React, and TypeScript. See the [task
catalog](https://xtarter.sznm.dev/xtarterize/guide/tasks/overview/) for every
detected stack, generated file, and applicability rule.

## How it works

xtarterize detects the stack, resolves task statuses (`new`, `patch`, `skip`,
`conflict`), shows a plan for approval, then backs up files, installs task
dependencies, and applies changes. Tasks are idempotent, and modified files are
backed up under `.xtarterize/backups/`.

## License

MIT
