# xtarterize

> Apply conformance configuration to JavaScript and TypeScript projects

[![npm version](https://img.shields.io/npm/v/xtarterize.svg)](https://www.npmjs.com/package/xtarterize)
[![npm downloads](https://img.shields.io/npm/dm/xtarterize.svg)](https://www.npmjs.com/package/xtarterize)
[![License](https://img.shields.io/npm/l/xtarterize.svg)](https://github.com/agustinusnathaniel/xtarterize/blob/main/LICENSE)

`xtarterize` detects a project's stack, selects applicable configuration tasks,
previews changes, and applies approved updates. Existing values are preserved
by default; incompatible values are reported as conflicts.

## Requirements

- Node.js 24 or later
- A `package.json` with a `name` field
- An initialized Git repository

## Quick start

```bash
# Preview changes
npx xtarterize diff

# Review and apply changes
npx xtarterize init

# Check the result in CI
npx xtarterize check --quiet
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
solutions; and pnpm, npm, yarn, and bun package managers.

Task coverage is deepest for Vite, React, and TypeScript. Other detected stacks
receive the tasks that apply to them.

## How it works

1. Detect the framework, bundler, package manager, and existing configuration.
2. Resolve tasks and report each as `new`, `patch`, `skip`, or `conflict`.
3. Show a plan and ask for approval.
4. Back up files, install task dependencies, and apply changes.

Tasks are idempotent, and modified files are backed up under
`.xtarterize/backups/`. See the [task catalog](https://xtarter.sznm.dev/xtarterize/guide/tasks/overview/)
for generated files and applicability rules.

## License

MIT
