---
name: xtarterize
description: Apply production-grade conformance configurations (linting, type checking, CI, editor settings, AI skills, release tooling) to JS/TS projects. Scans package.json and config files to auto-detect framework, bundler, and styling, then resolves applicable tasks. Use when user mentions "xtarterize", "conformance", "setup linting", "add CI", "configure project", "init xtarterize", or any task name like "lint/biome", "ts/strict", or "ci/workflow".
---

# xtarterize

Scans any JS/TS project and applies curated configs via a task-based engine. **Always use `--format json`** for agent-driven invocations.

## When this skill loads

This skill is activated when the user asks about project conformance, linting setup, CI, or any xtarterize task. Upon loading:

1. **Assess the ask** — is the user requesting a full setup (`init`), a single task (`add`), a status check (`check`), or diagnostics (`doctor`)?
2. **Check current state first** — run `check --format json` to understand what's already configured before proposing changes
3. **Never guess task IDs** — load the task reference before using `add`
4. **Always use `--format json`** — parse structured output, never terminal text

## Quick reference

```bash
npx xtarterize check --format json   # { tasks: [{ id, label, group, status }] }
npx xtarterize diff --format json    # FileDiff[]
npx xtarterize list --format json    # { profile, tasks }
npx xtarterize doctor --format json  # { diagnostics: [{ name, status, message }] }
npx xtarterize add lint/biome --format json
npx xtarterize init --format json --yes
```

## JSON parsing patterns

After each command, parse the JSON to decide the next action:

| Command | Parse this field | To decide |
|---------|-----------------|-----------|
| `check --format json` | `tasks[].status` | If any status is `"new"` or `"patch"`, run `init` or `add` |
| `check --format json` | `diagnostics[].status` | If any is `"fail"`, run `doctor` before proceeding |
| `diff --format json` | Array length | If `[]`, nothing to change. If non-empty, show diffs to user |
| `diff --format json` | `[].filepath` | Which files will be modified |
| `diff --format json` | `[].stats.added + removed` | Magnitude of changes per file |
| `list --format json` | `tasks[].status` | Find the right task ID to pass to `add` |
| `list --format json` | `profile` | Understand the detected stack (framework, bundler, etc.) |
| `doctor --format json` | `diagnostics[].status` | Any `"fail"` needs fixing; `"warn"` is advisory |
| `init --format json` | `ok` | If `false`, something went wrong — check stderr |

## All commands

| Command | Purpose | Flags (always add `--format json`) |
|---------|---------|-----------------------------------|
| `init` | Apply all applicable tasks | `--yes`, `--dry-run`, `--skip <ids>`, `--only <ids>`, `--include-conflicts`, `--cwd <path>` |
| `sync` | Update existing configs | Same flags as `init` |
| `diff` | Preview pending changes | `--cwd <path>` |
| `check` | Audit conformance per task | `--verbose`, `--cwd <path>` |
| `add <id>` | Apply one task | `--cwd <path>` |
| `list` | List tasks with statuses | `--cwd <path>` |
| `restore <file>` | Recover from backup | Interactive only |
| `doctor` | Environment diagnostics | `--verbose`, `--cwd <path>` |

Task statuses: `"new"` (will create), `"patch"` (will update), `"skip"` (conformant), `"conflict"` (needs review — require `--include-conflicts`).

## Agent workflows

### Initialize a project

```bash
# 1. Check state
out=$(npx xtarterize check --format json --cwd "$dir")
# Parse out.tasks[].status — if all "skip", skip init

# 2. Preview
out=$(npx xtarterize diff --format json --cwd "$dir")
# Parse out — if empty array, nothing to do

# 3. Apply
out=$(npx xtarterize init --format json --yes --cwd "$dir")
```

### Add one task

```bash
# MANDATORY — Load references/tasks.md first to find exact task ID
out=$(npx xtarterize add ts/strict --format json --cwd "$dir")
```

### Diagnose failures

```bash
out=$(npx xtarterize doctor --format json --cwd "$dir")
# Parse out.diagnostics — any { "status": "fail" } needs attention
# Common fails: "Biome not installed", "Node version too old"
```

## Error handling

| Signal | Likely cause | Fix |
|--------|-------------|-----|
| `add <id>` → "Task not found" | Wrong task ID | `list --format json`, parse `tasks[].id` |
| `doctor` shows tool not installed | Missing dep | xtarterize only writes configs; user may need to install separately |
| Task shows `"conflict"` | Config differs | **Never auto-apply** — present to user, only with `--include-conflicts` |
| `--cwd` fails preflight | No `package.json` | Verify path exists and is a JS/TS project |

## Anti-patterns

- **NEVER** run `init --yes` without `diff --format json` first on existing projects
- **NEVER** edit `.xtarterize/backups/` — use `restore` to recover
- **NEVER** use `--include-conflicts` without user approval
- **NEVER** parse terminal output — always use `--format json`
- **NEVER** guess task IDs — load [references/tasks.md](references/tasks.md) first

## Reference files

- **Load** [references/tasks.md](references/tasks.md) **before `add`** — find exact task IDs. **MANDATORY — READ ENTIRE FILE.**
- **Load** [references/commands.md](references/commands.md) for detailed flag descriptions and JSON output shapes. **Do NOT load** for basic usage — covered above.
