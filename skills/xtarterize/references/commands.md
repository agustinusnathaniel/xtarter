# CLI Command Reference

All commands run via `npx xtarterize <command> [options]`. Replace `npx` with `pnpm dlx` or `bunx` as appropriate.

**For agent invocations, always use `--json`** to get structured output.

## Common flags

Every command accepts `--cwd` and `--json`; every command except `query` accepts `--quiet`:

| Flag           | Description                                           |
| -------------- | ----------------------------------------------------- |
| `--cwd <path>` | Target directory (default: current working directory) |
| `--json`       | Output machine-readable JSON (implies `--quiet`)      |
| `--quiet`      | Suppress interactive prompts and verbose output       |

`--json` and CI runs imply `--quiet`. `init`, `sync`, `diff`, `add`, `restore`, and `undo` also accept `--format <terminal|json>`; `init`, `sync`, and `add` accept `--timing` for per-task timing output.

---

## `init`

Scan project and apply conformance configurations.

```bash
npx xtarterize init --json --yes              # Apply all applicable tasks
npx xtarterize init --json --dry-run          # Preview only (same output as diff)
npx xtarterize init --json --only ts/strict   # Apply only specific tasks
npx xtarterize init --json --compose "strict TypeScript with CI"  # Rank by relevance, then apply
```

| Flag                  | Description                                                                                                    |
| --------------------- | -------------------------------------------------------------------------------------------------------------- |
| `--dry-run`           | Preview changes without applying                                                                               |
| `--yes` / `-y`        | Skip all confirmations, apply all                                                                              |
| `--skip <ids>`        | Exclude tasks (comma-separated IDs, e.g. `lint/biome,ts/strict`); skip wins over `--only`                      |
| `--only <ids>`        | Apply only specific tasks (comma-separated). A non-empty CLI `--only` overrides a persisted `only` selection   |
| `--include-conflicts` | Include conflicting tasks when applying                                                                        |
| `--compose <query>`   | Natural language query to order the task plan by relevance (e.g. `"strict TypeScript with CI"`); unmatched last |
| `--threshold <n>`     | Minimum relevance score for `--compose`, from 0 to 1 (default: `0.1`)                                          |

Without `--yes`, opens an interactive menu (Apply all / Select tasks / Dry run / Quit). In CI or with `--yes`, applies all applicable non-conflicting tasks non-interactively.

---

## `sync`

Update existing configurations to the latest templates. Only touches tasks with `patch` or `conflict` status. Accepts the same run flags as `init` except `--compose` and `--threshold`.

```bash
npx xtarterize sync --json --yes
```

---

## `diff`

Show pending changes (tasks with `new`, `patch`, or `conflict` status) without applying anything. Accepts the common flags plus `--format`.

```bash
npx xtarterize diff --json
```

---

## `check`

Audit conformance status per task and run tool/configuration diagnostics.

```bash
npx xtarterize check --json                    # Audit + diagnostics
npx xtarterize check --json --annotations      # Also emit GitHub Actions annotations
npx xtarterize check --json --badge ./badges   # Write conformance.svg into a directory
npx xtarterize check --badge -                 # SVG to stdout (stderr with --json)
```

| Flag             | Description                                                                                                     |
| ---------------- | --------------------------------------------------------------------------------------------------------------- |
| `--annotations`  | Emit GitHub Actions workflow command annotations (auto-enabled when `GITHUB_ACTIONS=true`)                      |
| `--badge <path>` | Generate a conformance badge SVG at a file or directory path, or `-` for stdout. With `--json`, `-` writes the SVG to stderr so stdout stays machine-readable |

Exits 1 unless every task is conformant and no diagnostic fails. Parse `tasks[].status` for non-conformant items (`"new"`, `"patch"`, `"conflict"`); `"skip"` means conformant.

---

## `add <task-id>`

Apply a single task by ID. Without an ID, opens an interactive picker (requires a terminal; task ID or `--all` is required in CI/quiet mode).

```bash
npx xtarterize add lint/biome --json
npx xtarterize add ts/strict --json
npx xtarterize add --all --json               # Apply all applicable new/patch tasks
```

| Flag                  | Description                                                   |
| --------------------- | ------------------------------------------------------------- |
| `--all`               | Apply all applicable new and patch tasks without interaction  |
| `--include-conflicts` | Apply conflicting tasks as well                               |

**Before running, load `references/tasks.md` to find the exact task ID.**

Shows a diff preview and asks for confirmation before applying unless `--quiet`/`--json`. A `skip` status reports "Already conformant"; a `conflict` status is blocked unless `--include-conflicts`.

---

## `list`

List all tasks and their status for the current project.

```bash
npx xtarterize list --json
```

Without `--json`, groups tasks by their group (Agent, CI/CD, Linting & Formatting, TypeScript, Vite Plugins, etc.) with status icons.

---

## `query <query>`

Rank tasks by relevance to a natural language query using a pure-algorithmic scoring engine (no AI): tokenization, stemming, and fuzzy matching against task labels, IDs, groups, keywords, and config targets.

```bash
npx xtarterize query "strict typescript" --json
npx xtarterize query "ci with linting" --json --limit 10
npx xtarterize query "react testing" --json --threshold 0.2
```

| Flag              | Description                                     |
| ----------------- | ----------------------------------------------- |
| `--limit <n>`     | Maximum results (default: 20; positive integer) |
| `--threshold <n>` | Minimum relevance score 0-1 (default: 0.1)      |

Invalid `--limit`/`--threshold` values print an error and exit 1. Signal names: `label`, `id`, `group`, `keywords`, `config`.

---

## `restore <filepath>`

Restore a file from `.xtarterize/backups/`.

```bash
npx xtarterize restore tsconfig.json
npx xtarterize restore tsconfig.json --yes    # Non-interactive: restore latest backup
```

| Flag           | Description                                  |
| -------------- | -------------------------------------------- |
| `--yes` / `-y` | Skip selection prompt, restore latest backup |

If multiple backups exist, prompts to select one; a single backup or `--yes` restores the latest without prompting.

---

## `undo`

Undo the last `init`, `sync`, or `add` run: restore every file it backed up and delete files it created. Reads the last run manifest and asks for confirmation; there is no `--yes` flag.

```bash
npx xtarterize undo --json
npx xtarterize undo --quiet    # Skip the confirmation prompt
```

Exits 1 when no previous run exists or some files could not be restored. Use `restore <filepath>` for a single file.

---

## `doctor`

Run environment and project diagnostics.

```bash
npx xtarterize doctor --json
npx xtarterize doctor --json --verbose    # Add a System group (platform, CPU, RAM)
```

| Flag        | Description                                             |
| ----------- | ------------------------------------------------------- |
| `--verbose` | Show additional system information (platform, CPU, RAM) |

Checks: environment (Node, Git), tools (Biome, ESLint, TypeScript, Commitlint, Knip when declared), project health (lockfile, tsconfig, README, .gitignore), and configuration conflicts (Biome + ESLint, Biome + Prettier, legacy ESLint config). Parse `diagnostics[].status` - any `"fail"` needs attention; `doctor` exits 1 on failures.

---

## JSON output shapes

Field names are stable agent contract; do not rename them.

**Run commands** (`init`, `sync`, `add`):

```json
{ "applied": 3, "errors": [], "ok": true, "skipped": 0, "taskId": "ts/strict", "status": "skip", "timing": { "detectionMs": 23, "resolutionMs": 14, "resolutionSumMs": 37 } }
```

For a single-task `add`, `taskId` is present and `status` is one of `new`, `patch`, `skip`, `conflict`, or `not-applicable`; `timing` appears only with `--timing`. `ok` is false when `errors` is non-empty (exit 1).

**`diff` and dry runs** (`init --dry-run`):

```json
{
  "files": [{ "action": "modify", "after": "{ ...new content... }", "before": "{ ...existing content... }", "filepath": "tsconfig.json", "hunks": [{ "header": "@@ ... @@", "lines": ["-old", "+new"], "added": 1, "removed": 1 }], "semantic": { "added": { "compilerOptions.strict": "true" } }, "stats": { "added": 5, "removed": 2 } }],
  "ok": false,
  "summary": { "total": 1, "stats": { "added": 5, "removed": 2 } }
}
```

`action` is `"create"` or `"modify"`; `before` is omitted for created files. `summary.failures` and `summary.stats` are omitted when zero. `ok` is true only when there are no files and no dry-run failures (`files: []` means nothing to change).

**`check`**: `{ "ok": true, "summary": { "conformant": 8, "total": 14 }, "tasks": [{ "id": "lint/biome", "label": "Biome (lint + format)", "group": "Linting & Formatting", "status": "new" }], "diagnostics": [{ "name": "Node.js", "status": "pass", "message": "v24.0.0" }], "timing": { "detectionMs": 23, "resolutionMs": 14, "resolutionSumMs": 37 } }`. `ok` is false when `conformant` is below `total` or any diagnostic fails; `tasks[].status` is `new`, `patch`, `skip`, or `conflict`.

**`list`**: `{ "ok": true, "profile": { "framework": "react", "bundler": "vite", "packageManager": "pnpm", "typescript": true }, "tasks": [{ "id": "ts/strict", "label": "tsconfig - strict compiler options", "group": "TypeScript", "status": "skip" }], "timing": { "detectionMs": 23, "resolutionMs": 14, "resolutionSumMs": 37 } }`

**`query`**: `{ "type": "query", "query": "strict typescript", "count": 1, "results": [{ "taskId": "ts/strict", "label": "tsconfig - strict compiler options", "group": "TypeScript", "relevance": 0.92, "status": "new", "signals": [{ "name": "label", "score": 0.95 }] }] }`. `count` is 0 and `results` is `[]` when nothing meets the threshold.

**`doctor`**: `{ "ok": true, "summary": { "pass": 8, "warn": 1, "fail": 0, "total": 9 }, "diagnostics": [{ "name": "Node.js", "status": "pass", "message": "v24.0.0" }] }`

**`restore` and `undo`**: `restore` returns `{ "filepath": "tsconfig.json", "ok": true, "restoredFrom": ".xtarterize/backups/...", "timestamp": "2026-01-01T00:00:00.000Z" }`; `undo` returns `{ "errors": [], "files": ["tsconfig.json"], "ok": true, "restored": 1, "timestamp": "2026-01-01T00:00:00.000Z", "total": 1, "removed": 2 }`. `undo` lists `files` in run-manifest order and adds `removed` only when files created by the run were deleted. Failures report `{ "error": "...", "ok": false }` (plus `filepath` for `restore`) and exit 1.
