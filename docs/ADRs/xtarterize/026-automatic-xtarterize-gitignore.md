# ADR 026: Automatically gitignore `.xtarterize/` in Target Projects

## Status

Accepted

## Date

2026-07-01

## Context

The `xtarterize` CLI creates a `.xtarterize/` directory in target projects as a
side effect of normal operation:

- **`.xtarterize/backups/`** — timestamped copies of files before modification
  (created by `applyTasks()`), plus the run manifest at
  `.xtarterize/backups/last-run.json` (ADR 022)
- **`.xtarterize/cache/`** — fingerprint cache for `detectProject()` at
  `.xtarterize/cache/profile-fingerprint.json` (ADR 021)
- **`.xtarterize/skills-install.log`** — installation log for agent skills

There is currently no mechanism that ensures these artifacts are gitignored.
ADR 021 already flagged this gap explicitly:

> "Adds `.xtarterize/cache/` directory to projects (gitignored if `.xtarterize/`
> is in root `.gitignore`)"

Users who run `xtarterize check` or `xtarterize apply` get untracked files in
`git status`:

```
❯ git status
Untracked files:
  .xtarterize/
```

This is not a correctness bug — `.xtarterize/` files are never committed or
published — but it creates friction. Every user has to manually add
`/.xtarterize/` to their `.gitignore`, or live with noise in their status
output.

### Commands affected

Codebase analysis shows these commands create or read `.xtarterize/` artifacts:

| Command   | Artifact              | Via                              |
| --------- | --------------------- | -------------------------------- |
| `init`    | Cache                 | `runCommand()` → `detectProject()` |
| `sync`    | Cache                 | `runCommand()` → `detectProject()` |
| `check`   | Cache                 | `scanProject()` → `detectProject()` |
| `diff`    | Cache                 | `scanProject()` → `detectProject()` |
| `add`     | Cache + backups       | `detectProject()` + `applyTasks()`  |
| `list`    | Cache                 | `scanProject()` → `detectProject()` |
| `undo`    | Reads backups         | Uses existing `.xtarterize/` dir    |
| `restore` | Reads backups         | Uses existing `.xtarterize/` dir    |

### What is NOT changing

- The shape of `.xtarterize/` subdirectories — not adding new directories,
  only ensuring the existing ones are gitignored
- The backup or cache storage format
- Any user-facing command semantics
- The `gitignore/tsbuildinfo` task — that guards a user-selected TypeScript
  feature; this is a tool side effect

## Decision

Add a `ensureXtarterizeGitignore()` utility function that ensures the target
project's `.gitignore` contains an entry for `/.xtarterize/`. The function is
exported from `@xtarterize/core` and called at the start of every command
handler that creates or reads `.xtarterize/` artifacts.

### Integration points

The function is called at the top of each affected command's `run()` handler,
**before** `runPreflight()` or `detectProject()`. This avoids coupling to any
single routing function (since commands use different entry paths) while
keeping a single implementation.

The call sites are:

| File                                                      | Change                                |
| --------------------------------------------------------- | ------------------------------------- |
| `apps/xtarterize/src/commands/init.ts`                    | Call at top of `run()`                |
| `apps/xtarterize/src/commands/sync.ts`                    | Call at top of `run()`                |
| `apps/xtarterize/src/commands/check.ts`                   | Call at top of `run()`                |
| `apps/xtarterize/src/commands/diff.ts`                    | Call at top of `run()`                |
| `apps/xtarterize/src/commands/add.ts`                     | Call at top of `run()`                |
| `apps/xtarterize/src/commands/list.ts`                    | Call at top of `run()`                |
| `apps/xtarterize/src/commands/undo.ts`                    | Call at top of `run()`                |
| `apps/xtarterize/src/commands/restore.ts`                 | Call at top of `run()`                |

Commands that do **not** create or read `.xtarterize/` artifacts
(`query`, `doctor`) are excluded to avoid unnecessary I/O.

All commands resolve `cwd` via `resolveCwd(args)` (either directly or through
`resolveCliContext(args).cwd`), so the same path resolution applies uniformly.

### Behavior specification

The function follows a simple 5-step state machine:

1. **Stat** `.gitignore` in the project root (`cwd`)
2. **If missing:** create the file with header line `# xtarterize internal artifacts` and content `/.xtarterize/` followed by a trailing newline
3. **If present:** read content and check for a line matching `/.xtarterize/` (exact match, or entry-level match considering `.gitignore` semantics — anchored to root)
4. **If missing from existing:** append a blank line, the header comment, `/.xtarterize/`, and a trailing newline
5. **If already present:** no-op (idempotent)

```typescript
function ensureXtarterizeGitignore(cwd: string): Promise<EnsureGitignoreResult>

interface EnsureGitignoreResult {
  action: 'created' | 'appended' | 'noop'
}
```

### Error handling (best-effort)

File I/O errors (permissions, read-only filesystem, race conditions) are
silently handled per the **boundary pattern** from ADR 019:

- `Effect.tryPromise` with `FileSystemError` + `Effect.orElseSucceed` fallback
- Return `{ action: 'noop' }` on any error
- A write failure never blocks the command from proceeding

This means the gitignore mechanism is always optional — a failure has zero
impact on the rest of the command execution.

### Export location

A new file `packages/core/src/ensure-gitignore.ts` containing the function,
re-exported from `packages/core/src/index.ts`.

## Rationale

### Why not a task

The existing `gitignore/tsbuildinfo` task guards a user-selected feature
(tsbuildinfo files). Users may legitimately want to track those files.
`.xtarterize/` is different — it is a tool implementation detail, not a
project configuration choice. Making it a task would:

- Let users accidentally skip it
- Frame a tool side effect as a user option
- Miss `check` and `diff` commands which don't run `applyTasks()`
- Miss `list` which doesn't run tasks at all

### Why per-command call, not a single routing point

The decision description originally proposed a single hook in `runCommand()`.
Codebase analysis shows this is insufficient: `runCommand()` is only used by
`init` and `sync`. Commands like `check`, `diff`, `add`, `list`, `undo`, and
`restore` use `scanProject()` or direct `detectProject()` calls instead.

The alternatives considered for a single chokepoint:

- **`runPreflight()`** — called by all commands, but adding a side effect
  (writing a file) to a function named "preflight" violates the principle of
  least surprise. Preflight checks state; it doesn't mutate it.
- **`detectProject()`** — called by most but not all commands. `undo` and
  `restore` read `.xtarterize/` via `readRunManifest()` / `listBackups()`
  without ever calling `detectProject()`.

Per-command calls are explicit, grepable, and easy to spot during code
review. The cost is 8 import + call sites, which is acceptable and maintainable.

### Idempotency guarantee

The function is idempotent by design — the 5-step state machine ensures that
running any command twice produces no redundant entries. This satisfies the
project's idempotency contract (see AGENTS.md).

## Consequences

### Positive

- **Zero friction**: users never see `.xtarterize/` in `git status` on any
  command
- **All commands covered**: `check`, `diff`, `add`, and `list` (which don't
  route through `runCommand()`) are explicitly handled
- **Idempotent by design**: second invocation is a no-op
- **Best-effort semantics**: write failure never blocks the command
- **Explicit call sites**: grepable, reviewable, easy to add to new commands

### Negative

- **8 call sites** rather than one chokepoint — maintenance burden if the
  function signature changes
- **Creates `.gitignore` if it doesn't exist** — a project without `.gitignore`
  will get one. This is considered acceptable: any project running `xtarterize`
  is a JS/TS project that should be using git, and the file is tiny.
- **Adds a comment header** to existing `.gitignore` files — minimal diff
  noise that users may notice.

### Risks

- **`.gitignore` already managed by another tool** — if the user has a
  generated `.gitignore` (e.g., from `npm init` or a project generator),
  appending a comment + entry is safe and standard.
- **No `/.xtarterize/` vs `.xtarterize/` distinction** — the root-anchored
  pattern `/.xtarterize/` is intentional: it only ignores the top-level
  `.xtarterize/` directory, not nested ones inside `packages/` or
  `node_modules/`.
- **Race on concurrent invocations** — two `xtarterize` commands running
  simultaneously could both see the line as absent and both append, producing a
  duplicate `/.xtarterize/` entry. Harmless (`git` ignores duplicates in
  `.gitignore`), but worth noting. A future improvement could use a lockfile or
  atomic read-check-write.

## Alternatives Considered

### Single hook in `runCommand()`

Proposed in the original decision summary. Rejected because `runCommand()` is
only called by `init` and `sync`. Commands `check`, `diff`, `add`, `list`,
`undo`, and `restore` use different entry paths and would be missed.

### Hook in `runPreflight()`

Rejected because `runPreflight()` is a validation function — it reads project
state and returns errors. Adding a side effect (writing `.gitignore`) would
violate the principle of least surprise and make the function's name
misleading.

### Task-based approach (`gitignore/xtarterize` task)

Rejected because:
- `check` and `diff` don't run `applyTasks()` so the task would never execute
- `list` doesn't run the task engine at all
- Frames a tool implementation detail as a user-configurable choice
- Users could skip it at the interactive prompt

### Hook at creation sites (`backup.ts`, `cache.ts`)

Decentralized and fragile — each artifact creation point would need its own
`.gitignore` check. Hard to test (3+ distributed code paths instead of 1
function). Easy to miss a new artifact directory.

### Hook in `detectProject()`

Rejected because `undo` and `restore` read `.xtarterize/` via
`readRunManifest()` / `listBackups()` without calling `detectProject()`.

### Related Decisions

- ADR 021: Fingerprint-based Profile Caching — first identified the
  `.gitignore` gap
- ADR 022: Run Manifest for Undo — added more `.xtarterize/backups/` artifacts
- ADR 019: Effect TS Error Handling — established the boundary pattern for
  best-effort I/O

## Unresolved Questions

- Should `doctor` also call `ensureXtarterizeGitignore()`? It doesn't create
  `.xtarterize/` artifacts, but running `doctor` in a project that has had
  prior `xtarterize` runs would find `.xtarterize/` already present. Defer
  until a user reports untracked files from `xtarterize doctor`.
- Should `query` be included? It does not call `detectProject()` and does not
  create `.xtarterize/` artifacts. If that changes in the future, add the call.
- Monorepo resolution: `resolveCwd(args)` (used by all commands via
  `resolveCliContext`) already handles scope resolution per ADR 023, so `cwd` is
  already the correct target. Workspace packages are not affected — the
  function operates on the scoped project root. If a future scope configuration
  mechanism changes `cwd` resolution, this should be re-evaluated.
