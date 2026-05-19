# CLI Command Reference

All commands run via `npx xtarterize <command> [options]`. Replace `npx` with `pnpm dlx` or `bunx` as appropriate.

**For agent invocations, always use `--format json`** to get structured output.

## Global flags

| Flag | Description |
|------|-------------|
| `--cwd <path>` | Target directory (default: current) |

---

## `init`

Scan project and apply conformance configurations.

```bash
npx xtarterize init --format json                   # Scan + apply, JSON output
npx xtarterize init --format json --cwd ../project   # Target directory
npx xtarterize init --format json --yes              # Non-interactive (CI-safe)
npx xtarterize init --format json --only ts/strict   # Apply only specific tasks
npx xtarterize init --format json --skip lint/biome  # Exclude specific tasks
npx xtarterize init --format json --dry-run          # Preview only (same as diff)
```

| Flag | Description |
|------|-------------|
| `--dry-run` | Preview changes without applying |
| `--yes` / `-y` | Skip all confirmations, apply all |
| `--skip <ids>` | Exclude tasks (comma-separated IDs, e.g. `lint/biome,ts/strict`) |
| `--only <ids>` | Apply only specific tasks (comma-separated) |
| `--quiet` | Suppress interactive prompts and verbose output |
| `--include-conflicts` | Include conflicting tasks when applying |
| `--format <fmt>` | Output format: `terminal` (default) or `json` |

Without `--yes`, opens an interactive task selection menu. In CI or with `--yes`, applies all applicable tasks non-interactively.

---

## `sync`

Update existing configurations to the latest templates. Only touches tasks with `patch` or `conflict` status.

```bash
npx xtarterize sync --format json
npx xtarterize sync --format json --yes
```

Same flags as `init`.

---

## `diff`

Show pending changes without applying anything. Agent output: array of `FileDiff`.

```bash
npx xtarterize diff --format json
npx xtarterize diff --format json --cwd ../project
```

| Flag | Description |
|------|-------------|
| `--quiet` | Suppress verbose output |
| `--json` | Output machine-readable JSON (alias for `--format json`) |
| `--format <fmt>` | Output format: `terminal` or `json` |

**Output shape (when `--format json`):**
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
npx xtarterize check --format json
npx xtarterize check --format json --cwd ../project
npx xtarterize check --format json --verbose    # Include tool/diagnostic checks
```

| Flag | Description |
|------|-------------|
| `--verbose` | Show tool installation and conflict checks |
| `--quiet` | Suppress verbose output |
| `--format json` | Output machine-readable JSON |

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
npx xtarterize add lint/biome --format json
npx xtarterize add ts/strict --format json
```

| Flag | Description |
|------|-------------|
| `--quiet` | Suppress interactive prompts |
| `--format <fmt>` | Output format: `terminal` or `json` |

Shows a diff preview before applying. If the task status is `skip`, outputs a message and exits without changes. If no task ID is provided, lists all available tasks.

**Before running, load `references/tasks.md` to find the exact task ID.**

---

## `list`

List all tasks and their status for the current project. Agent output: `{ profile, tasks }`.

```bash
npx xtarterize list --format json
npx xtarterize list --format json --cwd ../project
```

| Flag | Description |
|------|-------------|
| `--quiet` | Suppress verbose output |
| `--format json` | Output machine-readable JSON |

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

Without `--format json`, groups tasks by category (Agent, CI, Lint, TypeScript, etc.) with status icons.

---

## `restore <filepath>`

Restore a file from `.xtarterize/backups/`. **No JSON output** — interactive only.

```bash
npx xtarterize restore tsconfig.json
npx xtarterize restore vite.config.ts
```

If multiple backups exist, prompts to select which version. Non-interactive mode not supported — always requires confirmation.

---

## `doctor`

Run environment and project diagnostics. Agent output: `{ summary, diagnostics }`.

```bash
npx xtarterize doctor --format json
npx xtarterize doctor --format json --cwd ../project
npx xtarterize doctor --format json --verbose    # Include system info
```

| Flag | Description |
|------|-------------|
| `--quiet` | Suppress detailed output |
| `--verbose` | Show additional system information (platform, CPU, RAM) |
| `--format json` | Output machine-readable JSON |

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
