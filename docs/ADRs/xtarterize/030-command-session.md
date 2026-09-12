# ADR 030: Command Session Owns the Command Lifecycle

## Status

Accepted

## Date

2026-09-10

## Context

The CLI has four apply and report paths. `commands/run-command.ts` (436 lines)
serves only `init` and `sync`, and `add` has two more flows (515 and 325
lines). `resolveCliContext` and `resolveRuntimeFlags` both derive
`json`/`quiet`/`format`, `ensureXtarterizeGitignore` has eight call sites
(ADR 026), and `scanProject` re-runs preflight. Output is console-only
(roughly 90 `console.log` calls, 32 `process.exitCode` writes), and prompts
plus exits live in core (`packages/core/src/utils/prompts.ts`).

Interactive `add` applies tasks one at a time and writes a run manifest per
task, so `undo` restores only the last task.

## Decision

A `CommandSession` in `apps/xtarterize` owns open, plan, execute, and report.
Commands declare selection policy, prompts, and output shape; the session runs
the lifecycle:

- `SessionOutcome` carries applied and skipped counts, errors, statuses, diffs,
  and timing. One reporter renders it through terminal and JSON adapters.
- Prompts are injected: the clack adapter in production, a scripted adapter in
  tests. Cancellation is an outcome, not a thrown exit.
- One runtime resolver returns `RuntimeContext` (`cwd`, `json`, `quiet`,
  `format`, `ci`), replacing `resolveCliContext` and `resolveRuntimeFlags`, and
  commands share citty argument groups.
- `session.open` owns the gitignore entry (ADR 026) and preflight exactly once;
  `doctor` opts out of fail-fast.
- The entry sets the exit code from `outcome.ok`.

`add --all` and interactive `add` plan and execute once, so one run manifest
covers the whole operation.

Update (2026-09-12): the session now returns Effects and prompts are provided
by the app-level `Prompter` service (ADR 036). The lifecycle and outcome
contracts described above are unchanged.

## Rationale

- One lifecycle removes four apply and report paths and two flag resolvers.
- Injected prompts make interactive flows testable and remove prompt and exit
  calls from core.
- One manifest per `add` makes `undo` restore the whole operation (ADR 022).
- Terminal and JSON render from the same outcome, so a preflight failure under
  `--json` is JSON instead of human text.

## Alternatives Considered

- **Unify report formatting only.** Leaves the apply paths, flag resolvers, and
  per-command preflight duplication.
- **Declarative command framework.** More machinery than the four verbs need;
  the session boundary is the load-bearing part.
- **Keep prompts inside commands.** Untestable interactive flows and exit calls
  scattered across core and apps.
- **Keep per-command gitignore and preflight.** The eight call sites and
  repeated preflight this ADR removes.

## Consequences

### Positive

- Exit codes are centralized; interactive flows are testable with a scripted
  prompter.
- One gitignore pass and one preflight per command.

### Negative

- One manifest per `add` changes `undo` behavior (it now restores the whole
  operation); needs a changeset.
- Core loses prompt and exit usage on its public path; callers must be updated.
- A new integration suite (`test/integration/session.test.ts`) is added.

### Related Decisions

- ADR 019 (Effect), superseded for this session by ADR 036 (Effect
  orchestration layer), ADR 022 (manifest), ADR 026 (gitignore), Plan 043
  Phase 4.
