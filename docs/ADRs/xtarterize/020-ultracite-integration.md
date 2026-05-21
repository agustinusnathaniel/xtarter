# ADR-020: Include Ultracite as a First-Class Conformance Dependency

**Status:** Accepted (Supersedes ADR-004)  
**Date:** 2026-05-21

## Context

xtarterize provides Biome, Oxlint, and Oxfmt conformance setup for
JavaScript/TypeScript projects. ADR-004 (2026-04-29) decided to exclude
Ultracite integration because:

- Ultracite had its own CLI and initialization flow
- Wrapping it would duplicate responsibilities
- The boundary was clear: xtarterize for setup, Ultracite for presets

Since then, the landscape has shifted:

- Ultracite v7.7.0 now distributes first-class presets for Biome, Oxlint, and
  Oxfmt as importable packages (`ultracite/biome/*`, `ultracite/oxlint/*`,
  `ultracite/oxfmt`).
- xtarterize's user template projects (e.g., nextarter-tailwind,
  vite-react-tailwind-starter) already use `extends` to reference Ultracite
  presets, treating them as the de facto standard.
- Separating the two tools creates a gap: running xtarterize and then Ultracite
  results in conflicting config files, two sources of truth, and user confusion.
- The `depNames` pattern in xtarterize's task factory (added in this work)
  makes it trivial to install and manage `ultracite` alongside tool-specific
  deps like `@biomejs/biome` or `oxlint`.

## Decision

Include `ultracite` as a first-class dependency in xtarterize's Biome, Oxlint,
and Oxfmt tasks. Every task that sets up one of these tools will also install
`ultracite` and generate config files that extend/import Ultracite presets.

## Decision Drivers

- **Template parity**: xtarterize's own templates already use Ultracite extends.
  The tool should match what it ships.
- **Seamless UX**: Running xtarterize + Ultracite sequentially is confusing and
  error-prone. One tool should handle the full setup.
- **Zero friction**: Users who want Ultracite presets get them automatically
  without knowing about Ultracite. Users who don't want them can modify the
  generated config.
- **Low maintenance**: Ultracite presets are pure config imports — no tracking
  of CLI behavior or initialization flows.
- **Feature parity with user templates**: xtarterize should produce configs
  that match what experienced users ship.

## Considered Options

### Option 1 (Selected): First-Class Ultracite Integration

Install `ultracite` whenever Biome/Oxlint/Oxfmt is selected. Generate config
files that extend/import Ultracite presets.

### Option 2: Keep ADR-004 Boundary

Continue excluding Ultracite. Users must run xtarterize then Ultracite
separately.

- **Pros**: Clean separation, no coupling.
- **Cons**: Two CLI invocations, potential for conflicting configs, users
  templates already assume Ultracite is present.
- **Rejected because**: creates a worse UX than Option 1 for the most common
  workflow.

### Option 3: Auto-Detect Ultracite

Only use Ultracite presets if `ultracite` is already installed.

- **Pros**: Works for existing Ultracite users.
- **Cons**: Inconsistent behavior based on order of operations, doesn't help
  new users who want the best defaults.
- **Rejected because**: the `depNames` pattern already handles installation
  gracefully.

## Consequences

### Positive

- **Single source of truth**: xtarterize fully configures the linting stack in
  one pass, with the same presets users expect from Ultracite.
- **Template alignment**: Generated configs match xtarterize's own starter
  templates exactly.
- **New users get best defaults**: No extra step to discover and install
  Ultracite.
- \*\*Backward compatible`: Existing `.oxlintrc.json`files are detected and
merged (JSON format), while new projects get`oxlint.config.ts`.
- **`depNames` pattern extended**: The task factory now supports multiple
  dependencies, which can be reused by other tasks.

### Negative

- Users who explicitly don't want Ultracite must add overrides to their config.
- The `extends` field in `biome.json` means rules live in `node_modules`, not
  inline — users must look at the Ultracite source to understand rule behavior.
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

- **Biome**: Config uses `extends: ['ultracite/biome/core', ...]` with
  xtarterize overrides for conventions that differ from Ultracite defaults
  (e.g., `useConsistentTypeDefinitions: 'off'`, `useFilenamingConvention`).
- **Oxlint**: New projects generate `oxlint.config.ts` with `defineConfig` +
  `import ... from 'ultracite/oxlint/...'`. Existing `.oxlintrc.json` and
  `oxlint.config.json` files get JSON merge.
- **Oxfmt**: New projects generate `oxfmt.config.ts` spreading the Ultracite
  preset with `singleQuote: true`. Existing `.oxfmtrc.json` files are preserved
  as-is.
- **Detection**: Both old formats (`.oxlintrc.json`, `.oxfmtrc.json`) and new
  formats (`oxlint.config.*`, `oxfmt.config.*`) are detected by custom
  detectors in `detect.ts`.
- **Scripts**: `package-scripts.ts` already resolves `useUltracite` to
  determine which lint tool scripts to generate.

## Related Decisions

- **ADR-004**: Superseded by this ADR.
- **ADR-007**: Array replacement in JSON merge — relevant for understanding how
  `extends` arrays behave during merge.
- **ADR-009**: Framework-aware Biome config — extended by this ADR to use
  Ultracite extends instead of inline rules.
- **ADR-014**: Vite+ migration — oxlint/oxfmt tasks are now Vite+-aware and
  generate their full configs.

## References

- Ultracite source: `~/.opensrc/repos/github.com/haydenbleasel/ultracite`
- Presets analyzed at
  `packages/cli/config/ultracite/biome/*`,
  `packages/cli/config/ultracite/oxlint/*`,
  `packages/cli/config/ultracite/oxfmt`
