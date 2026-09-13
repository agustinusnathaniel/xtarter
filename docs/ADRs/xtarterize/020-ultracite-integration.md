# ADR-020: Include Ultracite as a First-Class Conformance Dependency

**Status:** Accepted (Supersedes ADR-004)  
**Date:** 2026-05-21

## Context

xtarterize provides Biome, Oxlint, and Oxfmt conformance setup. ADR-004
(2026-04-29) excluded Ultracite integration because it had its own CLI and
initialization flow, wrapping it would duplicate responsibilities, and the
boundary was clear: xtarterize for setup, Ultracite for presets.

Since then:

- Ultracite v7.7.0 distributes first-class presets for Biome, Oxlint, and Oxfmt
  as importable packages (`ultracite/biome/*`, `ultracite/oxlint/*`,
  `ultracite/oxfmt`).
- xtarterize's user template projects (nextarter-tailwind,
  vite-react-tailwind-starter) already use `extends` to reference those
  presets, treating them as the de facto standard.
- Running xtarterize and then Ultracite separately conflicts config files,
  creates two sources of truth, and confuses users.
- The `depNames` task-factory pattern (added in this work) makes it trivial to
  install `ultracite` alongside `@biomejs/biome` or `oxlint`.

## Decision

Include `ultracite` as a first-class dependency in xtarterize's Biome, Oxlint,
and Oxfmt tasks. Every task that sets up one of these tools will also install
`ultracite` and generate config files that extend/import Ultracite presets.

## Decision Drivers

- **Template parity**: xtarterize should produce what its own templates ship.
- **Seamless UX**: one tool handles the full setup; sequential runs are
  error-prone.
- **Low maintenance**: Ultracite presets are pure config imports, so there is
  no CLI behavior to track. Users get the presets automatically and can modify
  the generated config to opt out.

## Considered Options

### Option 1 (Selected): First-Class Ultracite Integration

Install `ultracite` whenever Biome, Oxlint, or Oxfmt is selected, and generate
config files that extend/import its presets.

### Option 2: Keep the ADR-004 Boundary

Rejected: two CLI invocations, potential conflicting configs, and user
templates that already assume Ultracite is present.

### Option 3: Auto-Detect Ultracite

Rejected: behavior would depend on order of operations and new users would not
get the best defaults; the `depNames` pattern already handles installation.

## Consequences

### Positive

- **Single source of truth**: one pass configures the linting stack with the
  presets users expect, matching xtarterize's starter templates.
- **New users get best defaults** without an extra discovery step.
- **Backward compatible**: existing `.oxlintrc.json` files are detected and
  merged; new projects get `oxlint.config.ts`.
- **`depNames` pattern extended** to multiple dependencies, reusable by other
  tasks.

### Negative

- Users who explicitly don't want Ultracite must add overrides to their config.
- The `extends` field in `biome.json` means rules live in `node_modules`, not
  inline - users must look at the Ultracite source to understand rule behavior.
- Install time increases slightly (additional package download).

### Risks

- **Ultracite breaking changes**: If Ultracite renames a preset or changes a
  rule default, projects may see new lint errors.
  - **Mitigation**: xtarterize pins to the semantic version of Ultracite and
    provides a `check` diff so users can review proposed changes.
- **Ghost `.oxlintrc.json` files**: Projects migrating from standalone
  `.oxlintrc.json` will end up with both the old JSON file and the new
  `oxlint.config.ts`/`oxlint.config.json`.
  - **Mitigation**: Detection now covers both formats. Users can safely delete
    the old file after verifying the new config works.

## Implementation Notes

- **Biome**: `extends: ['ultracite/biome/core', ...]` plus xtarterize overrides
  for conventions that differ (e.g., `useConsistentTypeDefinitions: 'off'`,
  `useFilenamingConvention`).
- **Oxlint**: new projects generate `oxlint.config.ts` with `defineConfig` and
  Ultracite imports; existing `.oxlintrc.json` / `oxlint.config.json` files get
  JSON merge.
- **Oxfmt**: new projects generate `oxfmt.config.ts` spreading the preset with
  `singleQuote: true`; existing `.oxfmtrc.json` files are preserved.
- **Detection**: custom detectors in `detect.ts` cover the old and new config
  formats.
- **Scripts**: `package-scripts.ts` resolves `useUltracite` to determine which
  lint tool scripts to generate.

## Related Decisions

- **ADR-004**: Superseded by this ADR.
- **ADR-007**: Array replacement in JSON merge - relevant for understanding how
  `extends` arrays behave during merge.
- **ADR-009**: Framework-aware Biome config - extended by this ADR to use
  Ultracite extends instead of inline rules.
- **ADR-014**: Vite+ migration - oxlint/oxfmt tasks are now Vite+-aware and
  generate their full configs.

## Schema Limitation: Biome skipComments

Biome 2.5.9 only supports `skipBlankLines` for `noExcessiveLinesPerFile` / `noExcessiveLinesPerFunction` (`skipComments` not in schema); Oxlint supports both. See https://biomejs.dev/linter/rules/no-excessive-lines-per-function/ and https://biomejs.dev/linter/rules/no-excessive-lines-per-file/.

## References

- Ultracite source: `~/.opensrc/repos/github.com/haydenbleasel/ultracite`
- Presets analyzed at
  `packages/cli/config/ultracite/biome/*`,
  `packages/cli/config/ultracite/oxlint/*`,
  `packages/cli/config/ultracite/oxfmt`
