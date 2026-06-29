# CLI Command Reference

All commands run via `npx xtarterize <command> [options]`. Replace `npx` with `pnpm dlx` or `bunx` as appropriate.

**For agent invocations, always use `--json`** to get structured output.

## Global flags

| Flag | Description |
|------|-------------|
| `--cwd <path>` | Target directory (default: current) |

---

## `init`

Scan project and apply conformance configurations.

```bash
npx xtarterize init --json                   # Scan + apply, JSON output
npx xtarterize init --json --cwd ../project   # Target directory
npx xtarterize init --json --yes              # Non-interactive (CI-safe)
npx xtarterize init --json --only ts/strict   # Apply only specific tasks
npx xtarterize init --json --skip lint/biome  # Exclude specific tasks
npx xtarterize init --json --dry-run          # Preview only (same as diff)
npx xtarterize init --json --compose "strict TypeScript with CI"  # Rank tasks by relevance, then apply
```

| Flag | Description |
|------|-------------|
| `--dry-run` | Preview changes without applying |
| `--yes` / `-y` | Skip all confirmations, apply all |
| `--skip <ids>` | Exclude tasks (comma-separated IDs, e.g. `lint/biome,ts/strict`) |
| `--only <ids>` | Apply only specific tasks (comma-separated) |
| `--quiet` | Suppress interactive prompts and verbose output |
| `--include-conflicts` | Include conflicting tasks when applying |
| `--compose <query>` | Natural language query to compose a targeted task plan (e.g. `"strict TypeScript with CI"`). Tasks are ranked by relevance before stepping through the normal init workflow. |
| `--format <fmt>` | Output format: `terminal` (default) or `json` |

Without `--yes`, opens an interactive task selection menu. In CI or with `--yes`, applies all applicable tasks non-interactively.

---

## `sync`

Update existing configurations to the latest templates. Only touches tasks with `patch` or `conflict` status.

```bash
npx xtarterize sync --json
npx xtarterize sync --json --yes
```

Same flags as `init`.

---

## `diff`

Show pending changes without applying anything. Agent output: array of `FileDiff`.

```bash
npx xtarterize diff --json
npx xtarterize diff --json --cwd ../project
```

| Flag | Description |
|------|-------------|
| `--quiet` | Suppress verbose output |
| `--json` | Output machine-readable JSON |
| `--format <fmt>` | Output format: `terminal` or `json` |

**Output shape (when `--json`):**
```json
[
  {
    "filepath": "tsconfig.json",
    "before": "{ ...existing content... }",
    "after": "{ ...new content... }",
    "hunks": [{ "header": "@@ ... @@", "lines": ["-old", "+new"], "added": 1, "removed": 1 }],
    "stats": { "added": 5, "removed": 2 },
    "semantic": { "added": { "compilerOptions.strict": "true" } }
  }
]
```

If no pending changes, returns an empty array `[]`.

---

## `check`

Audit conformance status per task. Agent output: `{ summary, tasks, diagnostics }`.

```bash
npx xtarterize check --json
npx xtarterize check --json --cwd ../project
npx xtarterize check --json --verbose    # Include tool/diagnostic checks
```

| Flag | Description |
|------|-------------|
| `--verbose` | Show tool installation and conflict checks |
| `--quiet` | Suppress verbose output |
| `--json` | Output machine-readable JSON |

**Output shape:**
```json
{
  "ok": true,
  "summary": { "conformant": 8, "total": 14 },
  "tasks": [
    { "id": "lint/biome", "label": "Biome linting", "group": "Lint", "status": "new" }
  ],
  "diagnostics": [
    { "name": "Node.js", "status": "pass", "message": "v24.0.0" }
  ]
}
```

Parse `tasks[].status` to find non-conformant items (`"new"`, `"patch"`, `"conflict"`).

---

## `add <task-id>`

Apply a single task by ID.

```bash
npx xtarterize add lint/biome --json
npx xtarterize add ts/strict --json
```

| Flag | Description |
|------|-------------|
| `--all` | Apply all applicable new and patch tasks without interaction |
| `--quiet` | Suppress interactive prompts |
| `--format <fmt>` | Output format: `terminal` or `json` |

Shows a diff preview before applying. If the task status is `skip`, outputs a message and exits without changes. If no task ID is provided, lists all available tasks.

**Before running, load `references/tasks.md` to find the exact task ID.**

---

## `list`

List all tasks and their status for the current project. Agent output: `{ profile, tasks }`.

```bash
npx xtarterize list --json
npx xtarterize list --json --cwd ../project
```

| Flag | Description |
|------|-------------|
| `--quiet` | Suppress verbose output |
| `--json` | Output machine-readable JSON |

**Output shape:**
```json
{
  "ok": true,
  "profile": {
    "framework": "react",
    "bundler": "vite",
    "packageManager": "pnpm",
    "typescript": true
  },
  "tasks": [
    { "id": "lint/biome", "label": "Biome linting", "group": "Lint", "status": "new" },
    { "id": "ts/strict", "label": "Strict mode", "group": "TypeScript", "status": "skip" }
  ]
}
```

Without `--json`, groups tasks by category (Agent, CI, Lint, TypeScript, etc.) with status icons.

---

## `query <query>` — Search tasks by natural language

A pure-algorithmic scoring engine (no AI) that ranks xtarterize tasks by relevance to a natural language query. Uses tokenization, stemming, fuzzy matching, and synonym expansion to match against task labels, IDs, groups, keywords, and config targets.

```bash
npx xtarterize query "strict typescript" --json
npx xtarterize query "ci with linting" --json --limit 10
npx xtarterize query "react testing" --json --threshold 0.2
```

| Flag | Description |
|------|-------------|
| `--limit <n>` | Maximum results (default: 20) |
| `--threshold <n>` | Minimum relevance score 0-1 (default: 0.1) |
| `--quiet` | Suppress verbose output |
| `--json` | Output machine-readable JSON |

**Output shape:**
```json
{
  "type": "query",
  "query": "strict typescript",
  "count": 3,
  "results": [
    {
      "taskId": "ts/strict",
      "label": "Strict TypeScript configuration",
      "group": "TypeScript",
      "relevance": 0.92,
      "signals": [
        { "name": "label", "score": 0.95 },
        { "name": "id", "score": 0.75 },
        { "name": "group", "score": 1.0 },
        { "name": "keywords", "score": 0.85 },
        { "name": "config", "score": 0.55 }
      ]
    }
  ],
  "timing": { "scan": 12, "resolve": 3 }
}
```

Signal names: `label`, `id`, `group`, `keywords`, `config`. Each represents how strongly that field matched the query.

If no results meet the threshold, `count` is 0 and `results` is an empty array.

---

## `restore <filepath>`

Restore a file from `.xtarterize/backups/`.

```bash
npx xtarterize restore tsconfig.json
npx xtarterize restore vite.config.ts
npx xtarterize restore tsconfig.json --yes   # Non-interactive, restore latest
```

| Flag | Description |
|------|-------------|
| `--yes` / `-y` | Skip selection prompt, restore latest backup |
| `--quiet` | Suppress verbose output |

If multiple backups exist, prompts to select which version. Use `--yes` to skip the prompt and restore the latest backup automatically (non-interactive/CI-safe). Use `--quiet` for compact output.

---

## `doctor`

Run environment and project diagnostics. Agent output: `{ summary, diagnostics }`.

```bash
npx xtarterize doctor --json
npx xtarterize doctor --json --cwd ../project
npx xtarterize doctor --json --verbose    # Include system info
```

| Flag | Description |
|------|-------------|
| `--quiet` | Suppress detailed output |
| `--verbose` | Show additional system information (platform, CPU, RAM) |
| `--json` | Output machine-readable JSON |

**Output shape:**
```json
{
  "ok": true,
  "summary": { "pass": 8, "warn": 1, "fail": 0, "total": 9 },
  "diagnostics": [
    { "name": "Node.js", "status": "pass", "message": "v24.0.0" },
    { "name": "Biome", "status": "fail", "message": "Not installed" }
  ]
}
```

Checks: environment (Node version, pnpm), tools (Biome, TypeScript), project health (valid package.json, git), and configuration conflicts (multiple linters, legacy configs). Parse `diagnostics[].status` — any `"fail"` needs attention.
