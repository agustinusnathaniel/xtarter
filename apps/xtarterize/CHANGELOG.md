# xtarterize

## 1.23.4

### Patch Changes

- [#172](https://github.com/agustinusnathaniel/xtarter/pull/172) [`654b8b9`](https://github.com/agustinusnathaniel/xtarter/commit/654b8b921210bb6877820a91a290e9aa8f765e3d) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - perf(add): check task statuses concurrently via resolveTaskStatuses

- [#172](https://github.com/agustinusnathaniel/xtarter/pull/172) [`654b8b9`](https://github.com/agustinusnathaniel/xtarter/commit/654b8b921210bb6877820a91a290e9aa8f765e3d) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - fix: keep init --compose output from polluting JSON stdout when --format json is used

- [#175](https://github.com/agustinusnathaniel/xtarter/pull/175) [`00e8cb7`](https://github.com/agustinusnathaniel/xtarter/commit/00e8cb74669d36676f4817880fd5d4147bb27dd0) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - perf: collect dryRun diffs concurrently and dedupe resolve timing; refine task-diffs to use Effect for concurrency consistency and eliminate shared mutable state

## 1.23.3

## 1.23.2

### Patch Changes

- [#164](https://github.com/agustinusnathaniel/xtarter/pull/164) [`4a510a6`](https://github.com/agustinusnathaniel/xtarter/commit/4a510a6c5b596a03a797f717db50e8fa78963ae4) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - fix: `add --all` JSON output no longer claims success when a task check fails
  
  When a task's `check()` threw during `add --all --format json` (e.g. a misbehaving plugin task), the command set exit code 1 but still emitted `{"ok": true}` — the JSON `ok` field disagreed with the process exit code. Check failures are now collected into the reported errors, so `ok` is false and the errors array names the failed checks whenever any task check throws.

## 1.23.1

### Patch Changes

- [#158](https://github.com/agustinusnathaniel/xtarter/pull/158) [`8da3e56`](https://github.com/agustinusnathaniel/xtarter/commit/8da3e56f00aeb55ac82d9347ce112c0e475c96c0) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - Use the Changesets GitHub Action version compatible with Changesets CLI v3 so npm publishing also creates GitHub releases and tags.

## 1.23.0

### Minor Changes

- [#157](https://github.com/agustinusnathaniel/xtarter/pull/157) [`2522f04`](https://github.com/agustinusnathaniel/xtarter/commit/2522f04d302aa4b6f02b4830ded686c0a3909b56) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - feat: persist task selection in `.xtarterizerc`
  
  `.xtarterizerc` (and the `"xtarterize"` key in `package.json`) now accepts
  `skip` and `only` arrays alongside `plugins`, giving every run a persisted
  default filter:
  
  - `skip` — task IDs always excluded from runs.
  - `only` — when non-empty, restricts runs to these task IDs; an empty or
    absent list means no restriction.
  
  CLI flags keep precedence over the config: `--only` replaces the config
  `only` list, while `--skip` extends the config `skip` list. A task listed
  in both `skip` and `only` is excluded (skip wins). Entries are trimmed,
  and empty or non-string entries are dropped. When a selection references
  unknown task IDs, sync/init print a warning — suppressed in quiet and JSON
  mode so stdout stays machine-readable.

- [#155](https://github.com/agustinusnathaniel/xtarter/pull/155) [`af32df5`](https://github.com/agustinusnathaniel/xtarter/commit/af32df5ef8ab52c6e6023bf629908d282572836e) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - feat: emit machine-readable JSON from undo and restore
  
  `undo` and `restore` now support `--json` (or `--format json`) and emit a
  single machine-readable result payload on stdout instead of human logs:
  
  - `undo --json` — `{ ok, timestamp, restored, total, files, errors }`, plus
    `removed: <count>` when the run created files that undo deleted (created-by-
    run files have no backup, so removal is the correct pre-run restore).
  - `restore <file> --json` — `{ ok, filepath, restoredFrom, timestamp }`.
  - Error paths stay machine-readable too: missing manifest, no backups found,
    per-file restore failures, and usage errors all emit a JSON payload with
    `ok: false` and an `error` field, and set exit code 1.
  - JSON mode implies quiet and auto-confirms, so stdout carries only the JSON
    document — pipe straight into CI or scripts. The `ok` field agrees with the
    process exit code, matching the contract already shipped for `check`,
    `diff`, `doctor`, `list`, `add`, `init`, and `sync`. Every command in the
    CLI now speaks JSON.
  - `check`, `list`, and `query` now declare the `--json` flag they already
    honored (previously it worked but was invisible in `--help`).

## 1.22.0

### Minor Changes

- [#151](https://github.com/agustinusnathaniel/xtarter/pull/151) [`7fc347e`](https://github.com/agustinusnathaniel/xtarter/commit/7fc347e64542d1a9bc4a9480f41d807c529631dd) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - Show task status (new/patch/skip/conflict) in query results

## 1.21.0

## 1.20.1

### Patch Changes

- [#140](https://github.com/agustinusnathaniel/xtarter/pull/140) [`fe69cad`](https://github.com/agustinusnathaniel/xtarter/commit/fe69cad5f2226280f197c213797e8367d60cbf68) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - `diff --json` (and `init`/`sync` `--dry-run --json`) now emit a machine-readable payload even when there are no pending changes - previously a fully conformant project printed human text like "No pending changes" on stdout (or nothing at all), breaking the JSON contract for CI consumers. The payload's `ok` field agrees with the exit code, and dry-run failures are surfaced as `summary.failures`.

- [#137](https://github.com/agustinusnathaniel/xtarter/pull/137) [`1733ebf`](https://github.com/agustinusnathaniel/xtarter/commit/1733ebfc11dbee6c044c98a512451960fb43ae57) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - `init`, `add`, and `sync` no longer fail with "No package manager auto-detected" when installing dependencies on fresh projects that have `package.json` but no lockfile: the detected package manager (npm fallback) is now passed to dependency installs instead of letting nypm re-run its own detection, which found nothing and threw.

- [#139](https://github.com/agustinusnathaniel/xtarter/pull/139) [`25b6ba8`](https://github.com/agustinusnathaniel/xtarter/commit/25b6ba8ddd60c767fd3844609e66be27ed74341b) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - `add`, `init`, and `sync` no longer emit a leading blank line before the JSON payload in `--json`/`--format json` mode - stdout now contains exactly the machine-readable payload, as documented.

- [#141](https://github.com/agustinusnathaniel/xtarter/pull/141) [`ab54037`](https://github.com/agustinusnathaniel/xtarter/commit/ab54037fbb97c4b86db63da0ef557bd01ce87e40) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - fix: use atomic writes for run manifest to prevent corruption on crash, tighten plugin specifier regex to reject `~` in package names, and batch `add --all` task application for faster execution

## 1.20.0

### Minor Changes

- [#135](https://github.com/agustinusnathaniel/xtarter/pull/135) [`7214167`](https://github.com/agustinusnathaniel/xtarter/commit/7214167ee9987356f52cffc33f0dcc539f66cec0) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - feat: emit machine-readable JSON from add, init, and sync

  `add`, `init`, and `sync` now support `--json` (or `--format json`) and emit a
  single machine-readable result payload on stdout instead of human logs:
  - `add <task-id> --json` - `{ ok, taskId, status, applied, skipped, errors }`
  - `add --all --json` and `init`/`sync --yes --json` - `{ ok, applied, skipped, errors }`
  - JSON mode implies quiet: stdout carries only the JSON document, so the payload
    can be piped straight into automation (CI, scripts, tooling). Human logs go to
    stderr or are suppressed, and dependency-install output is silenced.
  - The `ok` field agrees with the process exit code (1 on errors), matching the
    exit-code contract introduced for `check`, `diff`, and `doctor`.

### Patch Changes

- [#134](https://github.com/agustinusnathaniel/xtarter/pull/134) [`cad8039`](https://github.com/agustinusnathaniel/xtarter/commit/cad8039bd1119b5b9c28ba53b68b503b41857224) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - `add` now supports `--include-conflicts`, mirroring `init`/`sync`. `add --all` and `add <task-id>` can force-apply conflicting tasks, and `add --all` warns when conflicting tasks were skipped so CI runs aren't silently incomplete.

- [#131](https://github.com/agustinusnathaniel/xtarter/pull/131) [`e37d79f`](https://github.com/agustinusnathaniel/xtarter/commit/e37d79fe617668977127afde6119c72cf325caa4) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - fix: `add` reports conflicting tasks as not applied instead of claiming success

  When a task's check returned `conflict` (e.g. `ts/strict` on a tsconfig that already
  sets `strict: false`), `add` fell through to the apply step, where `applyTasks`
  silently skipped the conflict (applied=0, errors=0) - the command then logged
  "applied successfully" and exited 0 even though nothing was applied. Now `add`
  detects the conflict up front, warns the user, exits 1, and never touches the
  conflicting file. Interactive mode counts conflicts as skipped instead of applied,
  and `diff` includes conflict diffs so they are visible before adding.

- [#133](https://github.com/agustinusnathaniel/xtarter/pull/133) [`744d831`](https://github.com/agustinusnathaniel/xtarter/commit/744d8315db23a4f779d7bdd25340beaa8e13fb7a) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - fix: `sync`/`init` honor `--include-conflicts` in non-interactive (`--yes`/quiet) mode

  `--include-conflicts` was passed through to `applyTasks` in the interactive apply-all and
  select paths, but silently dropped in the `--yes`/quiet path - so
  `xtarterize sync --yes --include-conflicts` (or `init --yes --include-conflicts`) skipped
  every conflicting task despite the flag. Non-interactive mode is exactly where the flag
  matters (CI, scripts), so conflicting tasks are now applied when it is set, consistent
  with the interactive paths.

- [#136](https://github.com/agustinusnathaniel/xtarter/pull/136) [`78449ea`](https://github.com/agustinusnathaniel/xtarter/commit/78449eaef265e54a8b8c3fc3db8fc6aee84f085b) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - `check`, `list`, `diff`, `init`, and `sync` no longer crash when a single task's `check()` throws: the task degrades to `conflict` (with a warning naming the task and error) and the rest of the audit still resolves. Previously one failing task check aborted the entire command with an unhandled `TaskError` and no output.

## 1.19.0

### Minor Changes

- [#127](https://github.com/agustinusnathaniel/xtarter/pull/127) [`e9b776d`](https://github.com/agustinusnathaniel/xtarter/commit/e9b776d95120130fc30654dc6cf4112fa740e504) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - feat: emit GitHub Actions workflow command annotations from check
  - New `--annotations` flag on `check` emits `::error`/`::warning` workflow
    command annotations per non-conformant task and failing diagnostic, so
    conformance failures surface inline on files in GitHub Actions.
  - Auto-enabled when running inside GitHub Actions (`GITHUB_ACTIONS=true`).
  - Annotations are emitted on stderr so `--json` and `--badge -` output stays
    machine-readable.

### Patch Changes

- [#129](https://github.com/agustinusnathaniel/xtarter/pull/129) [`93e3d86`](https://github.com/agustinusnathaniel/xtarter/commit/93e3d86bd1bdfe45d025877b52be953fb9467268) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - fix: keep `check --badge` output from polluting stdout in JSON mode and when writing the badge to stdout
  - `check --badge - --json` no longer interleaves the badge SVG with the JSON payload on stdout - the SVG goes to stderr so the JSON stays parseable.
  - `check --badge <file> --json` no longer lets the "Badge written" success message break the JSON payload.
  - `check --badge -` (human mode) no longer follows the SVG with the human-readable audit on the same stream; the audit routes to stderr so piping the SVG to a file yields clean markup.

- [#130](https://github.com/agustinusnathaniel/xtarter/pull/130) [`ab22fc9`](https://github.com/agustinusnathaniel/xtarter/commit/ab22fc97b2fe6c97d7ad93edb64a864e464c634b) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - fix: `undo` now removes files that a run created instead of failing with "No backup found"

  Previously `undo` only restored files that had a backup, so files newly created by
  `init`/`add`/`sync` (e.g. `biome.json`) were left behind and the command exited 1.
  Now a manifest entry without a backup is treated as a file created by the run and
  is deleted to restore the pre-run state.

## 1.18.0

### Minor Changes

- [#116](https://github.com/agustinusnathaniel/xtarter/pull/116) [`6aea841`](https://github.com/agustinusnathaniel/xtarter/commit/6aea841c1c459a88f57a3ef4253358be5ed3e3e5) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - feat: add CI-friendly exit codes to check, diff, and doctor commands
  - check: exits 1 when the project has pending changes or failing diagnostics (was always 0)
  - diff: exits 1 when at least one change is pending, mirroring `git diff --exit-code`
  - doctor: exits 1 when at least one diagnostic fails
  - init/sync --dry-run and other mutating commands: exit 1 on dry-run task failures

## 1.17.3

## 1.17.2

### Patch Changes

- [#104](https://github.com/agustinusnathaniel/xtarter/pull/104) [`0f8e694`](https://github.com/agustinusnathaniel/xtarter/commit/0f8e69444bf6f6623fd2401082c40ca5af6fa8f6) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - Extract shared helper functions (createSetupSteps, getCompilerOptions, computePackageJsonChanges, computeFileDiffs, resolveProjectLintConfig) to eliminate factory workflow duplication. Simplify create-xtarter-app CLI with reusable helpers. Deduplicate isRecord/isStringRecord type guards. Simplify bundler detection in core.

## 1.17.1

### Patch Changes

- [#90](https://github.com/agustinusnathaniel/xtarter/pull/90) [`c96b053`](https://github.com/agustinusnathaniel/xtarter/commit/c96b053ebc3999393ce7261aefda0423e8110ae6) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - update deps to latest

## 1.17.0

### Minor Changes

- [#88](https://github.com/agustinusnathaniel/xtarter/pull/88) [`b916204`](https://github.com/agustinusnathaniel/xtarter/commit/b916204b790fa85e2e7919be24df960d05439f30) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - feat: enhance TypeScript strict config, add new tasks, extend git hooks, improve VSCode settings
  - ts/strict: now manages noUnusedLocals, noUnusedParameters, verbatimModuleSyntax alongside strict
  - quality/package-engines: add devEngines field to package.json
  - workspace/pnpm-workspace: generate pnpm-workspace.yaml for pnpm projects
  - release/versionrc: generate .versionrc.json for changelog section customization
  - release/git-hooks: add prepare-commit-msg hook for commitizen/czg integration
  - editor/vscode: enhance settings.json with TanStack Router and TypeScript configs

### Patch Changes

- [#84](https://github.com/agustinusnathaniel/xtarter/pull/84) [`52b0735`](https://github.com/agustinusnathaniel/xtarter/commit/52b07351865c8d080d1e2b6e9e07a745c9394c60) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - New `mergeYaml` / `parseYaml` public exports in `@xtarterize/patchers` for YAML config merging. Plugin specifier validation to prevent arbitrary code execution from malicious `.xtarterizerc` entries. `installDependency` now throws on failure instead of silently logging warnings.

## 1.16.4

### Patch Changes

- [#82](https://github.com/agustinusnathaniel/xtarter/pull/82) [`f90c7b4`](https://github.com/agustinusnathaniel/xtarter/commit/f90c7b437a2cb0fd510f16e749495e163ff48361) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - Auto-gitignore .xtarterize/ internal artifacts in target projects

## 1.16.3

### Patch Changes

- [#80](https://github.com/agustinusnathaniel/xtarter/pull/80) [`d4dd84b`](https://github.com/agustinusnathaniel/xtarter/commit/d4dd84bbe12732d441e56b261ccff9a381eb2e86) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - ci: optimize pipeline

## 1.16.2

### Patch Changes

- [#78](https://github.com/agustinusnathaniel/xtarter/pull/78) [`f5c701b`](https://github.com/agustinusnathaniel/xtarter/commit/f5c701bd4d29a33b9f168e71334b950183ea034a) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - Fix task status resolution not to abort on first failure; surface check/dryRun errors in ApplyResult; fix Node engine version range parsing in doctor

## 1.16.1

### Patch Changes

- [`bf0eddb`](https://github.com/agustinusnathaniel/xtarter/commit/bf0eddbe7b36690c68851ad9dfd5d943b28abc58) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - Show package-manager-aware command prefix in query suggestions; fix resolveCwd treating positional args as directory paths; add missing preflight checks and cwd arg forwarding to all subcommands

## 1.16.0

### Minor Changes

- [#75](https://github.com/agustinusnathaniel/xtarter/pull/75) [`be651f3`](https://github.com/agustinusnathaniel/xtarter/commit/be651f3aa5e6bac9098fc145fd0a3651f7b4fbbb) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - feat: add natural language task query engine with `query` command and `init --compose`

  New features:
  - `xtarterize query <query>` - search and discover tasks using natural language with a pure-algorithmic scoring engine
  - `xtarterize init --compose <query>` - compose a targeted task plan by ranking tasks by relevance
  - Task metadata enrichment: new optional `searchMeta` field on the Task interface with `tags`, `configTargets`, and `keywords` supports richer search results
  - All 26 built-in tasks now include search metadata
  - Query output redesigned with domain-bundle grouping, compact one-liners, and per-group actionable add commands
  - Scoring optimized: per-token best match across synonyms eliminates dilution from low-scoring expanded terms
  - Query command runs standalone without requiring project context (package.json)
  - Hyphenated queries ("agent-skills") match spaced terms ("agent skills") via hyphen normalization
  - Input validation hardening and edge case fixes

## 1.15.2

### Patch Changes

- [#73](https://github.com/agustinusnathaniel/xtarter/pull/73) [`aec3c0a`](https://github.com/agustinusnathaniel/xtarter/commit/aec3c0a4d289c5984183d738d99727555b84c602) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - Refactor task resolution with TaskScope system for monorepo-aware task filtering

  Introduces a `TaskScope` type (`'root' | 'package' | 'both'`) that each task can declare. When running in a monorepo:
  - **Root-scoped tasks** (CI/CD, release tooling, turbo, renovate, editor config, npmrc, gitignore, package scripts) are excluded when running inside a workspace package.
  - **Package-scoped tasks** (tsconfig path aliases, vite-plugin-checker, rollup-plugin-visualizer) are excluded when running from the monorepo root.
  - Tasks without explicit scope (or with `scope: 'both'`) are included everywhere, preserving backward compatibility.

  Also fixes runtime detection so Node.js projects using Vite for build orchestration are correctly identified as `runtime: 'node'` instead of `runtime: 'browser'`.

## 1.15.1

### Patch Changes

- [`3c68470`](https://github.com/agustinusnathaniel/xtarter/commit/3c684707e7b252dfc5da8c1fc4496436efa40331) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - fix: make profile cache write resilient to concurrent cleanup

  The `writeProfileCache` function now re-creates the cache directory before
  rename, preventing ENOENT errors when parallel processes clean up the
  `.xtarterize/cache` directory between steps.

## 1.15.0

### Minor Changes

- [#69](https://github.com/agustinusnathaniel/xtarter/pull/69) [`331efa4`](https://github.com/agustinusnathaniel/xtarter/commit/331efa4b2d94862c8c7d629b4829df5e1150cfe8) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - feat: add --yes and --quiet flags to restore command
  - `restore --yes` skips confirmation and selects latest backup automatically
  - `restore --quiet` suppresses verbose output

  feat: add --all flag to add command
  - `add --all` applies all new and patch tasks without interaction

  feat: expose --json flag in doctor command args
  - `doctor --json` now appears in command-level help output

## 1.14.4

### Patch Changes

- [`ec142cb`](https://github.com/agustinusnathaniel/xtarter/commit/ec142cbb6e48297f6b12a4729676f283d8a0537d) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - fix: handle package install failures gracefully and fix CI test stability
  - installDependency now catches nypm errors and logs a warning instead of
    throwing, preventing package install failures from blocking config
    modifications
  - doctor --verbose now correctly overrides CI-forced quiet mode
  - Explicit turbo dependencies ensure build outputs exist before tests run
  - Increase test timeouts for slow pnpm installs in CI

## 1.14.3

### Patch Changes

- [`0941ef3`](https://github.com/agustinusnathaniel/xtarter/commit/0941ef3e1dd9a3eb31ba031c201b0d36a33995b4) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - fix: correct broken skill references in agent skill catalog
  fix: git hooks now work on npm, yarn, and bun package managers
  fix: engines.node raised to >=24 for clear error on unsupported Node versions
  fix: resolve backup filename collision that could cause silent data loss
  fix: add path traversal validation to backup restore for security hardening
  fix: align Vite plugin dryRun output with apply output for reliable diffs
  fix: improve detection cache fingerprint to detect config file changes

## 1.14.2

### Patch Changes

- [`c637a36`](https://github.com/agustinusnathaniel/xtarter/commit/c637a3686e1c32e5a0cb658c2030201dcb5c32b1) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - Edge-case hardening across CLI, core, tasks, and UI layers:
  - **CLI** - try/catch guards on `init`, `sync`, `diff`, `add`, `doctor`, and `restore` prevent crashes from individual task failures; `--skip`/`--only` no longer matches phantom empty-string values; `doctor` uses `Promise.allSettled` for resilient diagnostics
  - **Core** - robust atomic writes with temp file cleanup on failure; schema validation guards against corrupted cache entries; fixed React Native + React co-detection; skipped count now correctly tracks explicit skips from check phase
  - **Tasks** - fixed `this.getScripts` undefined crash in `packageScriptsTask`; `commitMsgHook` accepts a package manager parameter instead of hardcoding pnpm; corrected `check()` status detection for `conflict` vs `new`
  - **UI** - merged multi-diff preserves earlier diffs instead of dropping them; JSON `ok` field reflects actual conformance state; multiselect cancel properly aborts
  - **Documentation** - outdated content refreshed (Node.js minimum bumped to 24, missing CLI flags documented, task applicability corrected, path fixes)

## 1.14.1

### Patch Changes

- [`f805556`](https://github.com/agustinusnathaniel/xtarter/commit/f805556aa43083099883c7561fb72df8592176a6) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - fix(add): make taskId positional arg optional

  `xtarterize add` without a task ID now enters interactive mode directly instead of requiring a task ID or empty string.

## 1.14.0

### Minor Changes

- [`7ddedae`](https://github.com/agustinusnathaniel/xtarter/commit/7ddedaeda4360653ba8bb959e2d9a6164741c17d) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - feat: add undo command, interactive add, and conformance badge
  - `xtarterize undo` reverts the last run by restoring all backed-up files in one command
  - `xtarterize add` without a task ID shows a grouped multi-select menu for interactive task selection
  - `xtarterize check --badge <path>` generates an SVG conformance badge
  - Add RunManifest type and writeRunManifest/readRunManifest/listAllBackups to core backup module

## 1.13.11

### Patch Changes

- [#53](https://github.com/agustinusnathaniel/xtarter/pull/53) [`e6ee639`](https://github.com/agustinusnathaniel/xtarter/commit/e6ee639237787260dd13616bc45c0482851e5437) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - refactor: add per-command timing instrumentation

  Adds timing measurement for each phase of command execution (detection,
  resolution, apply) with per-task breakdown available via the new `--timing`
  global flag. Timing summary is displayed at the end of every command in
  terminal output, and included in JSON output for `--json` mode.

## 1.13.10

## 1.13.9

## 1.13.8

## 1.13.7

### Patch Changes

- [#46](https://github.com/agustinusnathaniel/xtarter/pull/46) [`5706e0b`](https://github.com/agustinusnathaniel/xtarter/commit/5706e0b1da60b4ed7763d9b3ae7a1862baa49841) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - adopt Effect TS v4 for internal error handling and workflow composition

  **Why Effect v4.**

  The project's async workflows had ad-hoc error handling - `try/catch` with
  `new Error(String(cause))` that lost error type context, couldn't distinguish
  error kinds at the type level, and made it impossible to pattern-match on
  failures. Effect v4 provides `Data.TaggedError` (discriminated unions that
  extend `Error`), `Effect.tryPromise` (typed promise wrapping), `Effect.gen`
  (ergonomic generator-based composition), and `Effect.all` (structured
  concurrency with error aggregation).

  **Approach: boundary pattern, not full migration.**

  Rather than making every function return `Effect<A, E>` (which would require
  all callers to understand Effect), we apply Effect at two levels:
  1. **Internal composition** - async workflows use `Effect.gen` + `yield*`,
     `Effect.all` for concurrency, and `Effect.tryPromise` with typed error
     handlers. This gives us structured error handling without changing
     how consumers call the library.
  2. **Promise boundary** - all public API signatures remain `Promise<T>`.
     `Effect.runPromise` unwraps at the function boundary. Tests require zero
     changes.

  **What changed (26 files, +1857/-1571):**

  Tagged errors and Effect composition:
  - `packages/core/src/errors.ts` (new) - consolidated `Data.TaggedError`
    types: `FileSystemError` (read/write/parse failures), `BackupError`
    (backup operations), `TaskError` (task check/apply failures)
  - `packages/core/src/utils/fs.ts` - every FS operation wraps with
    `Effect.tryPromise` catching as `FileSystemError` instead of generic
    `new Error(String(cause))`
  - `packages/core/src/backup.ts` - backup workflow uses `Effect.gen` for
    sequential steps (access → mkdir → cp → read/write index) with
    `BackupError` typing and atomic index writes
  - `packages/core/src/diagnostics.ts` - parallel checks via `Effect.all`,
    tool execution with `FileSystemError`, all `tryEffect` helpers upgraded
    to tagged errors; exported `tryReadPackageJson` to eliminate 4 copies
    of the null-guard pattern
  - `packages/core/src/preflight.ts` - validation orchestration via
    `Effect.gen` with `FileSystemError`; deduplicated `tryEffect` by
    importing from diagnostics
  - `packages/core/src/resolve.ts` - concurrent task status checks via
    `Effect.all`
  - `packages/core/src/apply.ts` - per-task error handling with `TaskError`,
    same-name tasks continue after failures
  - `packages/core/src/utils/deep-equal.ts` - custom recursion replaced
    with `Equal.equals` from Effect

  Reducing Effect ceremony:
  - `packages/tasks/src/factory/ops.ts` - added `wrapTask(taskId, method, fn)`
    internal helper collapsing the 6-line `Effect.runPromise(Effect.tryPromise)`
    pattern into 1 line
  - `packages/tasks/src/factory/index.ts` - replaced 15 Effect wrappers,
    removed `Effect` import
  - `packages/tasks/src/factory/task.ts` - replaced 3 wrappers, removed
    `Effect` and `TaskError` imports
  - `packages/tasks/src/agent/skills-install.ts` - replaced 3 wrappers,
    removed `Effect` import, fixed hardcoded task IDs in error metadata

  **Trade-offs.**
  - Added Effect v4 beta as a dependency (~44 MB install size, 10 transitive
    deps). Beta stability risk is mitigated by pinning the exact version in
    `pnpm-workspace.yaml` catalog.
  - The initial adoption introduced `Effect.tryPromise` ceremony at every
    call site; subsequent consolidation via `wrapTask` collapsed 21 such
    wrappers into a single 8-line helper, removing the `Effect` import from
    all task factory files.

  **Verification.**

  All 323 existing tests pass unchanged. `Effect.runPromise` at each function
  boundary ensures the Promise-based public API is preserved.

## 1.13.6

### Patch Changes

- [`e65b98c`](https://github.com/agustinusnathaniel/xtarter/commit/e65b98c57b3a640365d867befb0e551769841b70) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - Remove redundant default values from biome.json and .oxfmtrc.json templates (formatter.enabled, linter.enabled, semicolons, trailingComma, etc.)

  Add type-safe config interfaces: generated Configuration type from @biomejs/biome schema, upstream OxlintConfig/OxlintEnv types, and local OxfmtConfig type

  Switch commitlint.config.ts output from JSDoc @type to import type { UserConfig }

## 1.13.5

### Patch Changes

- [`8dca764`](https://github.com/agustinusnathaniel/xtarter/commit/8dca764cb467e5efe14c130c446c43830469ac9a) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - fix(tasks): add -y flag for agent skills install

## 1.13.4

## 1.13.3

## 1.13.2

### Patch Changes

- [`746caae`](https://github.com/agustinusnathaniel/xtarter/commit/746caae9d39aa967318639418b90a684170b8047) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - fix: read version from package.json via ^ alias instead of hardcoding

## 1.13.1

### Patch Changes

- [`f1069d6`](https://github.com/agustinusnathaniel/xtarter/commit/f1069d6bea26aabece3ed030303642e1d3f14693) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - refactor: enrich oxlint and biome config templates with additional lint rules

  Add non-recommended rules mapped from typical ESLint configs:
  - Oxlint: max-params, eqeqeq, prefer-const, no-var, prefer-template, no-shadow, consistent-type-definitions, array-type, react rules, vitest overrides, unicorn relaxations, import rules
  - Biome: noExcessiveCognitiveComplexity, useMaxParams, useConsistentTypeDefinitions, useConsistentTestIt overrides

## 1.13.0

### Patch Changes

- [`813b1ea`](https://github.com/agustinusnathaniel/xtarter/commit/813b1eadecb75ba42d92b34911d968a072bbaaf6) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - refactor(diff-display): use unified diff format for all dry-run output

  Consolidates three separate renderers (full-file, hunk, semantic) into a single unified diff format (`renderHunkDiff`) for consistent git-style patch output across new, modified, and JSON files in `--dryRun` and `diff` commands.

## 1.12.0

### Minor Changes

- [`cff22ee`](https://github.com/agustinusnathaniel/xtarter/commit/cff22ee02d29c62888647e6000c919215a4a7195) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - feat: add multi-layer shebang enforcement for CLI binaries
  fix: add missing node shebang to create-xtarter-app CLI entry
  chore: add all-contributors setup

## 1.11.0

### Minor Changes

- [`23ccade`](https://github.com/agustinusnathaniel/xtarter/commit/23ccadee1814ce6798fba4d43b09ac6a2b42bb02) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - feat: add colored tag utility and per-task spinner animation to CLI
  fix: add workspace flag to pnpm dependency installs in monorepo roots
  chore: bump build target from node18 to node20, add engines.node >=24 to packages

## 1.10.0

### Minor Changes

- [`e68ae84`](https://github.com/agustinusnathaniel/xtarter/commit/e68ae84a8dc673547e39bd86a887a6836927b9c7) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - enhance diff/dry-run output with hunks, stats, and semantic JSON diffing
  - Add `DiffHunk`, `ChangeStats`, `SemanticEntry` types and optional fields on `FileDiff`
  - Add `computeChangeStats`, `computeUnifiedHunks`, `computeSemanticJsonDiff`, `enhanceDiff` core utilities
  - Add `--format` flag to `init`, `sync`, `diff`, and `add` commands (`terminal` | `json`)
  - Terminal output now shows `+N -M` change stats per file, `@@` hunk headers, and key-level semantic diffs for JSON files
  - JSON output includes structured hunks, stats, and semantic data for AI-agent consumption

## 1.9.0

## 1.8.0

### Minor Changes

- [`03231fa`](https://github.com/agustinusnathaniel/xtarter/commit/03231fa33b95f17143a7d78093c8d7cf9614e602) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - Enhanced `doctor` command with grouped output (Environment, Tools, Project, Configuration), environment and project health checks, installed tool version display, and `--verbose` flag for system information.

## 1.7.0

## 1.6.1

### Patch Changes

- [`acc82f8`](https://github.com/agustinusnathaniel/xtarter/commit/acc82f8b2f1f1ee2695ac85b92b03ef5cb9d1a72) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - Internal refactoring: extract shared utilities, reorganize module structure, move deepEqual to @xtarterize/core, and rename apps/cli to apps/xtarterize.

## 1.6.0

### Minor Changes

- [`82e1d9f`](https://github.com/agustinusnathaniel/xtarterize/commit/82e1d9f24fd223a8f3c15c0b516c89fe5537c105) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - Improve script merging and task architecture
  - Enhance script merging logic with better conflict resolution
  - Improve task architecture for better maintainability
  - Add tests for scripts and codegen tasks
  - Update apply logic to not include conflicts by default unless explicitly requested

### Patch Changes

- [`82e1d9f`](https://github.com/agustinusnathaniel/xtarterize/commit/82e1d9f24fd223a8f3c15c0b516c89fe5537c105) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - Update .gitignore
  - Add missing ignore patterns for better monorepo hygiene

- [`82e1d9f`](https://github.com/agustinusnathaniel/xtarterize/commit/82e1d9f24fd223a8f3c15c0b516c89fe5537c105) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - Refactor CLI run-command to extract seams
  - Extract god-function seams into smaller, focused functions
  - Improve code organization in `apps/cli/src/commands/run-command.ts`
  - Update init and sync commands for consistency

## 1.5.0

### Minor Changes

- [`b9d0bc6`](https://github.com/agustinusnathaniel/xtarterize/commit/b9d0bc6569bc1b653e755e1454b389c0b78d340b) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - adds a new `doctor` command with human and JSON diagnostics output, expands machine-readable JSON output support across auditing commands, and refactors CLI command internals to share preflight/runtime/spinner utilities.

  Core detection and reliability were improved by making backup index writes atomic/resilient and by improving monorepo detection for workspace package directories. Task internals were also refactored by splitting large factory helpers into smaller modules while preserving behavior.

### Patch Changes

- [`658c504`](https://github.com/agustinusnathaniel/xtarterize/commit/658c50470e462b958f0bcbc6a0eaeb92ed15acd0) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - Refactor internal architecture by deepening module seams in project detection and task execution.
  - modularize core detection into focused adapters (framework, bundler, router, styling, package manager, monorepo)
  - centralize JSON config mutation flow in shared task helpers
  - consolidate agent task behavior behind a dedicated agent module seam

  These changes improve maintainability, testability, and consistency without changing end-user CLI behavior.

## 1.4.4

### Patch Changes

- [`522509e`](https://github.com/agustinusnathaniel/xtarterize/commit/522509e8a70327d7b8c618b804ac7a4390538be7) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - Fix skills being incorrectly marked as installed when their folder is empty, causing batch installs to skip them.

## 1.4.3

### Patch Changes

- [`fb47341`](https://github.com/agustinusnathaniel/xtarterize/commit/fb47341064dd28c4d24286edccd6b60a0e767791) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - Batch skill installations by source repository to avoid redundant `npx` invocations. Skills from the same source (e.g. `expo/skills` with 8 skills) are now grouped into a single command with multiple `--skill` flags, reducing repo cloning from N times to 1 per unique source.

## 1.4.2

### Patch Changes

- [`d74c677`](https://github.com/agustinusnathaniel/xtarterize/commit/d74c677de59f9a446318fd9b61c7106a385d41a4) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - refactor: add antd, heroui, chakra-ui agent skills check

## 1.4.1

## 1.4.0

### Minor Changes

- [`52511f0`](https://github.com/agustinusnathaniel/xtarterize/commit/52511f048510f2bfdd81afccd97545eb69d1264d) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - feat: add pnpm workspace catalog for centralized dependency versions

  feat(tasks): add editorconfig, npmrc, nvmrc, lint-staged, and git hooks tasks

  refactor(factory): add depCondition option and dynamic filepath support to PackageJsonTask

### Patch Changes

- [`52511f0`](https://github.com/agustinusnathaniel/xtarterize/commit/52511f048510f2bfdd81afccd97545eb69d1264d) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - fix(tasks): exclude .agents and .claude dirs from Biome file includes

  fix(tasks): make knip task applicable to all projects with format-aware config

  fix(tasks): replace non-null assertions with type-safe depName guards

## 1.3.0

### Minor Changes

- [`3534a6f`](https://github.com/agustinusnathaniel/xtarterize/commit/3534a6f981ba5ac41fed9658cd06f77560979dfb) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - Expand skills-install catalog with 20+ new stack-specific skills and refactor to declarative array format
  - Refactored `getSkillsToInstall` from imperative `if/push` blocks to a declarative `SKILL_CATALOG` array with per-skill `condition` functions for easier maintenance
  - Added new skills across multiple categories:
    - **Frontend/UI**: `baseline-ui`, `fixing-accessibility`, `fixing-metadata`, `fixing-motion-performance`
    - **React**: `react-dev`, `react-useeffect`
    - **Vue/Nuxt**: `vue`, `vue-best-practices`, `nuxt`
    - **Expo/RN**: `upgrading-expo`, `vercel-react-native-skills`
    - **Build tools**: `vite`, `vitest`, `tsdown`, `turborepo`
    - **Database/Auth**: `supabase-postgres-best-practices`, `postgres-drizzle`, `redis-best-practices`, `better-auth-best-practices`, `create-auth-skill`
    - **AI/SDKs**: `ai-sdk`
    - **Specialized**: `remotion-best-practices`
  - Updated tests and documentation to reflect the expanded catalog

## 1.2.1

### Patch Changes

- [`d561f32`](https://github.com/agustinusnathaniel/xtarterize/commit/d561f325a596cb7dd026a894d83296d13c3e5eec) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - fix(tasks): inherit stdio in skills-install for visible progress

## 1.2.0

### Minor Changes

- [`ccd9287`](https://github.com/agustinusnathaniel/xtarterize/commit/ccd9287afd967ed1ea0ef0c64b4a4a468e95b550) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - feat: merge duplicate JSON file diffs in CLI output

  The `diff` command and `init --dry-run` now group multiple task diffs targeting the same JSON file into a single unified diff. Previously, independent tasks like `ts/incremental`, `ts/paths`, and `ts/strict` each produced a separate `FileDiff` for `tsconfig.json`, resulting in overlapping and confusing output.

  Now, diffs are grouped by `filepath` and merged using `patchJson` so the user sees the complete intended state of each file in one view.

- [`ccd9287`](https://github.com/agustinusnathaniel/xtarterize/commit/ccd9287afd967ed1ea0ef0c64b4a4a468e95b550) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - feat: add `patchJson` for surgical JSON text edits using `jsonc-parser`

  Replaced `JSON.stringify(mergeJson(...), null, 2)` with `patchJson`, which performs byte-level text edits via Microsoft's [`jsonc-parser`](https://github.com/microsoft/node-jsonc-parser). This preserves:
  - Comments (`// inline` and `/* block */`)
  - Key ordering
  - Whitespace and indentation style
  - Trailing commas (in JSONC)

  Applies to all JSON config tasks: `createJsonMergeTask`, `createMultiFileJsonMergeTask`, and `createPackageJsonTask`.

  **BREAKING CHANGE for consumers:** `@xtarterize/patchers` now requires `jsonc-parser` as a runtime dependency. The CLI bundler marks it as `neverBundle` to avoid inline bundling issues.

- [`ccd9287`](https://github.com/agustinusnathaniel/xtarterize/commit/ccd9287afd967ed1ea0ef0c64b4a4a468e95b550) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - feat: smart equivalence detection across all task types

  Tasks now detect equivalence at the **value/content level**, not just by key name. This prevents redundant or conflicting diffs when the same configuration already exists in a different form.

  **Package scripts** - `createPackageJsonTask` skips adding a script if the **exact same command string** already exists under any script name. For example, `"type:check": "tsc --noEmit"` prevents adding `"typecheck": "tsc --noEmit"`.

  **JSON config `extends`** - Added `normalizeExtends` helper. `"extends": "config:base"` is now treated as equivalent to `"extends": ["config:base"]"` during comparison. Used by `biomeTask` and `renovateTask`.

  **Text files** - `createSimpleFileTask` now normalizes line endings (`\r\n` → `\n`) before comparing content, preventing false mismatches on CRLF files.

  **Behavior change:** Tasks that previously returned `conflict` for script mismatches now return `patch` and only add the _missing_ scripts. Existing scripts are never overwritten.

### Patch Changes

- [`5b93cc4`](https://github.com/agustinusnathaniel/xtarterize/commit/5b93cc443fbe95d6ec777daa1f47e4520e25f3e1) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - chore: update dependencies to latest safe versions
  - `@clack/prompts` ^1.2.0 → ^1.3.0
  - `astro` ^6.1.10 → ^6.2.1
  - `sharp` ^0.34.3 → ^0.34.5
  - `pnpm` ^10.24.0 → ^10.33.2 (packageManager)
  - `turbo` ^2.9.6 → ^2.9.7
  - `defu` ^6.1.4 → ^6.1.7
  - `js-yaml` ^4.1.0 → ^4.1.1
  - Removed deprecated `@types/diff` (diff@9 ships built-in types)
  - `@tailwindcss/vite` kept at 4.2.2 (4.2.4 incompatible with current Vite)

## 1.1.1

### Patch Changes

- [`04b6ce4`](https://github.com/agustinusnathaniel/xtarterize/commit/04b6ce4126dca549992b12f15913b71d740d50ef) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - extract plop templates to .hbs files

## 1.1.0

### Minor Changes

- [`e230c41`](https://github.com/agustinusnathaniel/xtarterize/commit/e230c411c4b04cfdd942bc5d3f1d89f2e289e02c) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - adds automatic agent skills installation based on your stack, fixes the --cwd flag to actually work, renders the conformance plan and dry-run output as proper tables, and improves framework-aware config generation across Biome, Plop, and CI workflows.

## 1.0.1

### Patch Changes

- [`13b4eb7`](https://github.com/agustinusnathaniel/xtarterize/commit/13b4eb78fcd7b57525c3605fc7b68682bb0250d0) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - polishing and ironing

## 1.0.0

### Major Changes

- [`09cfc08`](https://github.com/agustinusnathaniel/xtarterize/commit/09cfc08ed19b6a7246acb8e0320ae50fb270f57c) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - 1.0 Release
