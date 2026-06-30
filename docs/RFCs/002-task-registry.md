# RFC-002: Using shadcn CLI as a Task Template Delivery Mechanism

**Status:** Rejected
**Date:** 2026-06-27

## Decision

Rejected. After analysis, shadcn CLI cannot replace any part of xtarterize's template or pipeline layer. See details below.

## Summary

Evaluate whether `shadcn add` can serve as the file delivery mechanism for xtarterize tasks - replacing `createFileTask`'s `apply()` for templates that are currently built into the xtarterize npm package. The idea: instead of shipping template source in the CLI, xtarterize would shell out to `shadcn add <registry>/<item>` to download config files, then wrap the result in its own check/dryRun/backup pipeline.

## Motivation

- Reduce xtarterize's bundle size by moving template content out of the npm package
- Decouple template updates from CLI releases (templates update independently via registry)
- Leverage shadcn's existing infrastructure (GitHub hosting, ref pinning, registry index)
- Let users see and edit template source in a public GitHub repo

## How shadcn CLI Works

The shadcn registry system works as follows:

### Registry Resolution

`shadcn add owner/repo/item` resolves a three-part address:

| Part         | Meaning                | Example                               |
| ------------ | ---------------------- | ------------------------------------- |
| `owner/repo` | GitHub repository      | `agustinusnathaniel/xtarterize-tasks` |
| `item`       | Key in `registry.json` | `lint/biome`                          |

The CLI fetches `https://raw.githubusercontent.com/owner/repo/main/registry.json`, looks up the item, and downloads its declared `files[]` into the project.

### `registry.json` Structure

```jsonc
{
  "name": "my-registry",
  "items": [
    {
      "id": "lint/biome",
      "files": [
        {
          "path": "biome.json",
          "content": "{ \"linter\": { \"enabled\": true } }",
          "type": "registry:file",
        },
      ],
      "dependencies": {
        "npm": ["@biomejs/biome"],
        "dev": true,
      },
    },
  ],
}
```

Key properties:

| Field                  | Type              | Description                                               |
| ---------------------- | ----------------- | --------------------------------------------------------- |
| `files[].content`      | `string`          | Static file content - no variable substitution            |
| `files[].type`         | `"registry:file"` | Only file type supported; no computed/rendered types      |
| `files[].target`       | `string`          | Relative target path in the user's project                |
| `registryDependencies` | `string[]`        | Other items in the same registry that must be added first |
| `npm`                  | `string[]`        | npm packages to install (always devDependencies)          |

### CLI Flags

```
shadcn add <source> [options]

--dry-run    Show what would change without writing
--diff       Show the diff of changes
--yes        Skip confirmation prompt
--silent     Minimal output
--overwrite  Overwrite existing files
```

### Git Ref Versioning

`shadcn add owner/repo/item@v1.2.0` pins to a specific tag, branch, or commit SHA. Default is `@latest` (default branch). The resolved ref is not recorded or tracked - shadcn does not have a sync/update mechanism.

## Template Classification Analysis

We classified all 25 xtarterize task templates into three categories:

| Category    | Count | Dynamic content                                                                  | Can shadcn replace?                       |
| ----------- | ----- | -------------------------------------------------------------------------------- | ----------------------------------------- |
| Static      | ~3    | None - fixed content regardless of profile                                       | Technically yes, but ~60 lines total      |
| Templated   | ~12   | PM-interpolated (`runScriptCommand`, `${pm}`) - output varies by package manager | No - shadcn items are static              |
| Conditional | ~10   | Profile-aware (framework, bundler, monorepo tool) - logic decides what to render | No - no conditional execution in registry |

### Static Templates (viable candidates)

- `.editorconfig` (from `editor-quality` task)
- `.gitignore` tsbuildinfo entry (from `gitignore-tsbuildinfo` task)
- Various cosmetic templates with zero `profile` dependency

These are valid candidates for static file delivery. Combined, they amount to roughly 60 lines of content.

### Templated Examples (not viable)

| Template            | Dynamic element                                                             | Why shadcn can't do it                                               |
| ------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| CI release workflow | `renderReleaseWorkflow(profile, existing)` uses `runScriptCommand(pm, ...)` | Output differs per package manager (npm vs pnpm vs yarn)             |
| AGENTS.md           | `renderAgentsMd(profile)` inlines PM-specific commands for dev/build/test   | Commands are `{pm} run`, `{pm} test`, etc. - varies with detected PM |
| Biome config        | `renderBiomeJson(profile)` is framework-aware                               | React rules enabled for React projects, Vue rules for Vue            |

### Conditional Examples (not viable)

| Template        | Condition                                             | Why shadcn can't do it                             |
| --------------- | ----------------------------------------------------- | -------------------------------------------------- |
| tsconfig strict | Checks if `profile.typescript` is set                 | File should only exist if TypeScript is detected   |
| Vite plugins    | Only applicable if `profile.bundler === 'vite'`       | Profile-dependent applicability is a runtime check |
| Turbo config    | Only applicable if `profile.monorepoTool === 'turbo'` | Same - applicable() logic decides existence        |

## Integration Architecture (what it would take)

A `ShadcnTemplateTask` adapter would need to bridge shadcn CLI output into xtarterize's pipeline. Here is what each phase would require:

### `check()` - Determine if files would change

Shell out to `shadcn add <source> --dry-run --yes --silent --overwrite`, parse stdout to see whether files would be created or modified.

**Problem:** shadcn's dry-run output is not designed for machine parsing. It prints colored terminal text:

```
✔ Checking registry...
  → biome.json will be created
  → Installing dependencies...
```

No JSON output mode, no structured exit codes for "would change" vs "already matches." Parsing this is fragile across shadcn versions, locale settings, and terminal color configurations.

### `dryRun()` - Show what would change

Same shell out, but capture the diff output via `--diff`.

**Problem:** shadcn's `--diff` prints a terminal-formatted diff with ANSI color codes and context lines. The output is not structured like xtarterize's `FileDiff[]` which needs to power the backup/undo system, multi-task rollup, and the `--json` output flag.

### `apply()` - Write files

`shadcn add <source> --yes --overwrite`

**Problem:** shadcn writes files directly to the filesystem - it has no hook for xtarterize's `backupFile()` mechanism. After `apply()`, xtarterize would need to re-read the written files and manually record them in the `RunManifest` for undo support. This means xtarterize is tracking side effects from an opaque external process.

### Templating Gap

Even if shadcn downloads the file to the right location, xtarterize would need a post-processing step to substitute `profile.packageManager` and other variables into the static content. This recreates the template rendering logic that was supposed to be replaced by using shadcn in the first place.

### Additional Integration Surface

| Concern              | Required work                                                                |
| -------------------- | ---------------------------------------------------------------------------- |
| **CLI detection**    | Check if `shadcn` is installed (`which shadcn`); emit clear error if missing |
| **Version compat**   | `shadcn --version` might return anything; registry spec changes over time    |
| **npm install**      | Auto-install shadcn if missing? Global or local?                             |
| **Error handling**   | shadcn exit codes aren't documented; stderr parsing required                 |
| **Network failures** | shadcn fetches from GitHub raw; CI environments may lack access              |
| **Parallel tasks**   | Multiple shadcn calls per `xtarterize run` - serialization needed?           |

## Verdict (Why this is rejected)

1. **3 static templates (~60 lines) don't justify the integration cost.** Shelling out to a second CLI, parsing terminal output, handling missing shadcn installation, version compatibility, and post-processing templates adds more complexity than shipping the templates inline.

2. **The dynamic rendering is xtarterize's value.** `render(profile) → string` is not a bug to work around - it's the feature. Detection + conditional logic + PM-aware generation is why the tool exists. Removing or circumventing this would lose xtarterize's core differentiation.

3. **The plugin system (plan 019) is a better direction.** If templates need to live outside the npm package, they should be distributed as `Task` objects (TypeScript source with logic), not static files. The registry _concept_ (GitHub-hosted, ref-pinned) is useful for that. The shadcn CLI itself is not.

## Open Questions (closed by rejection)

| Question                                             | Resolution                                                       |
| ---------------------------------------------------- | ---------------------------------------------------------------- |
| Could shadcn develop a machine-readable output mode? | Not our decision to influence.                                   |
| Could we add templating to shadcn registry items?    | Would need to fork/extend the spec.                              |
| Could we use shadcn for just the 3 static templates? | Not worth the complexity of maintaining two delivery mechanisms. |

## References

- `plans/019-D3-extensibility-api.md` - Plugin system prototype (the direction we chose instead)
- `docs/RFCs/001-tui-mode-opentui.md` - First RFC format reference
- https://ui.shadcn.com/docs/registry - shadcn registry docs
- https://ui.shadcn.com/docs/registry/github - GitHub registry mode
- Template files analyzed: `packages/tasks/src/templates/*`
