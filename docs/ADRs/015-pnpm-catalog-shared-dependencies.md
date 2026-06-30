# ADR-015: pnpm Catalog for Shared Dependencies

**Status:** Accepted  
**Date:** 2026-05-07

## Context

In a pnpm workspace monorepo, multiple packages often depend on the same libraries (e.g., `typescript`, `tsdown`, `@types/node`). Without a centralized version pinning mechanism, each package declares its own version range, leading to:

- Version drift across packages (one package on `typescript@5.7`, another on `6.0`)
- Harder dependency updates (must change every package individually)
- Inconsistent resolved versions in the lockfile

pnpm's [catalog](https://pnpm.io/catalogs) feature solves this by defining shared version ranges in `pnpm-workspace.yaml`. Packages reference the catalog with `"catalog:"` instead of a literal version.

## Decision

Use pnpm workspace catalog for all dependencies shared across 2+ packages. Package-local dependencies (used by only one package) remain with literal version ranges.

### Catalog entries (`pnpm-workspace.yaml`)

```yaml
catalog:
  typescript: ^6.0.3
  tsdown: ^0.21.10
  "@types/node": ^25.6.0
  json5: ^2.2.3
  pathe: ^2.0.3
  tinyexec: ^1.1.2
  nypm: ^0.6.6
  jsonc-parser: ^3.3.1
  magicast: ^0.5.2
  consola: ^3.4.2
  defu: ^6.1.7
```

### Usage in package.json

```json
{
  "dependencies": {
    "consola": "catalog:",
    "json5": "catalog:"
  },
  "devDependencies": {
    "typescript": "catalog:",
    "tsdown": "catalog:"
  }
}
```

### What stays package-local

Dependencies used by only one package are not cataloged:

| Dep                   | Package  | Reason                                                          |
| --------------------- | -------- | --------------------------------------------------------------- |
| `@clack/prompts`      | cli      | CLI-specific                                                    |
| `citty`               | cli      | CLI-specific                                                    |
| `cli-table3`          | cli      | CLI-specific                                                    |
| `consola`             | core     | Only core uses it (but cataloged for forward compatibility)     |
| `defu`                | patchers | Only patchers uses it (but cataloged for forward compatibility) |
| `diff`                | core     | Single consumer                                                 |
| `picocolors`          | core     | Single consumer                                                 |
| `pkg-types`           | core     | Single consumer                                                 |
| `@astrojs/starlight*` | docs     | Docs-only                                                       |
| `astro`               | docs     | Docs-only                                                       |

## Rationale

- **Single source of truth** - version ranges defined once in `pnpm-workspace.yaml`
- **Atomic updates** - bump a catalog entry once, all packages get the update on `pnpm install`
- **Consistency** - no risk of two packages resolving to different minor versions of the same dep
- **pnpm native** - no tooling overhead, works with standard pnpm commands

## Alternatives Considered

### Root `package.json` devDependencies only

- Only works for devDependencies, not runtime dependencies
- Doesn't enforce version consistency across packages

### `pnpm.overrides` in root

- Forces a single version everywhere, but overrides semver ranges
- Less transparent - packages look like they depend on one version but get another

### Manual version coordination

- Error-prone, doesn't scale
- Already proven problematic as the workspace grew to 5 packages

## Consequences

- Adding a new shared dependency requires adding it to both `pnpm-workspace.yaml` (catalog) and the consuming `package.json` (with `"catalog:"`)
- Package-local deps can still use literal versions - no strict enforcement
- Catalog versions should be reviewed during dependency update cycles (section 6 of AGENTS.md)
- The catalog is the default; contributors should prefer `"catalog:"` over literal versions for any dependency used by 2+ packages
