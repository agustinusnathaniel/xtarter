# ADR 029: Task Spec Replaces Factory Option Bags

## Status

Accepted

## Date

2026-09-10

## Context

Tasks are built through seven factories (`createFileTask`,
`createMultiFileTask`, `createJsonMergeTask`, `createMultiFileJsonMergeTask`,
`createPackageJsonTask`, and variants) whose option interfaces carry 7 to 16
fields with overlapping names, including dead options (`merge`,
`ensureParentDir`, `depInstallName`, `deps`). Dependencies use two shapes
(`depName`/`depNames`/`installDev` and `getDeps`) and are installed inline from
five apply paths. Status logic disagrees with the diffs the factories compute:
`scripts/package-scripts` (`check` covers three script groups, `getScripts`
covers six), `lint/oxfmt` (`check` is always `skip`), `agent/agents-md`
(existence-only), `vite/checker` and `vite/visualizer` (three independent
probes and a synthetic `vite.config` diff path), and `agent/skills-install` (a
synthetic `.xtarterize/skills-install.log` diff that is never written). So
`check`, `dryRun`, and `apply` can disagree about the same project.

## Decision

One `defineTask` spec replaces the factories. A spec declares metadata and
applicability, targets with writer kinds, actions, and dependencies, and is
resolved once into a status and diffs:

- Target kinds: `text` (render), `jsonMerge` (incoming), `packageJson` (via the
  owner, ADR 027), and `transform` (content in and out on a discovered file).
- Action kind: a status probe plus a run effect, reported with no file diff.
- Status projection: `text` absent means `new` and differing content means
  `conflict`; `jsonMerge` and `packageJson` absent means `new`, a real change
  means `patch`, no change means `skip`. A per-target policy hook may return
  `conflict` and sees the same `before` and `after` the diff used.
- Dependencies are part of the resolution; `getDeps` is derived from it.
- `apply` performs the resolution's effects, using the owner for `packageJson`
  targets and the standard writer for file targets. The factories retire family
  by family as callers migrate; the registry validates unique ids, complete
  metadata, and non-empty derived `configTargets`.

## Rationale

- One resolution produces status and diffs, so check, dry run, and apply agree.
- Transform targets carry the real config path, so backup and `undo` restore
  the actual file (ADR 022).
- Actions stop inventing backup entries, and dead options and the second
  dependency shape disappear.

## Alternatives Considered

- **Keep the factories and fix internals.** Three code paths, per-factory drift.
- **Two interfaces (content tasks plus callbacks).** More surface, same risk.
- **Executor-coupled factories.** Blocks the side-effect-free plan (ADR 028).
- **Option bags plus validation.** Validation cannot unify check and diff.

## Consequences

### Positive

- Status and diff divergence becomes structurally impossible.
- vite diffs, backups, and undo use the real config path.
- skills install no longer reports a phantom diff or backup entry.

### Negative

- Migration risk is bounded by the existing test suites plus the new spec suite,
  with one family per commit.
- Four test files encode the old defects and are updated deliberately
  (`vite-plugins`, `skills-install`, `oxlint-config`, `package-scripts`); any
  other test change is a stop condition.
- Task authors learn one spec; task docs under `apps/docs` need updating.

### Related Decisions

- ADR 008, ADR 010, ADR 016, ADR 027, Plan 043 Phase 3.
