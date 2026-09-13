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

`shadcn add owner/repo/item` fetches
`https://raw.githubusercontent.com/owner/repo/main/registry.json`, looks up the
item, and downloads its declared `files[]` into the project. An item lists
static `files[]` (`content`, `target`, and only the `registry:file` type: no
variable substitution or computed/rendered types), optional
`registryDependencies`, and `npm` packages (always devDependencies). The CLI
exposes `--dry-run`, `--diff`, `--yes`, `--silent`, and `--overwrite`.
`shadcn add owner/repo/item@v1.2.0` pins to a tag, branch, or commit SHA
(default `@latest`), but the resolved ref is not recorded or tracked - there is
no sync/update mechanism.

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

Shell out to `shadcn add <source> --dry-run --yes --silent --overwrite` and
parse stdout. **Problem:** the output is colored terminal text (no JSON mode, no
structured exit codes for "would change" vs "already matches"), so parsing is
fragile across shadcn versions, locales, and terminal color configurations.

### `dryRun()` - Show what would change

Same shell out with `--diff`. **Problem:** the output is a terminal-formatted
diff with ANSI colors, not the structured `FileDiff[]` that powers the
backup/undo system, multi-task rollup, and `--json` output.

### `apply()` - Write files

`shadcn add <source> --yes --overwrite`. **Problem:** shadcn writes files
directly with no hook for xtarterize's `backupFile()`; xtarterize would have to
re-read the files and record them in the `RunManifest` manually, tracking side
effects from an opaque external process.

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

Update (2026-09-14): verdict 3's plugin direction was removed by ADR 037, so
external `Task` packages are no longer a supported extension point. The verdict
(reject shadcn CLI) is unchanged; the historical reasoning is preserved. The
referenced `plans/019-D3-extensibility-api.md` is gitignored and absent in a
fresh clone.

## Open Questions (closed by rejection)

| Question                                             | Resolution                                                       |
| ---------------------------------------------------- | ---------------------------------------------------------------- |
| Could shadcn develop a machine-readable output mode? | Not our decision to influence.                                   |
| Could we add templating to shadcn registry items?    | Would need to fork/extend the spec.                              |
| Could we use shadcn for just the 3 static templates? | Not worth the complexity of maintaining two delivery mechanisms. |

## References

- `plans/019-D3-extensibility-api.md` - plugin system prototype (gitignored,
  not present in a fresh clone; see the update note above)
- `docs/RFCs/001-tui-mode-opentui.md` - First RFC format reference
- https://ui.shadcn.com/docs/registry - shadcn registry docs
- https://ui.shadcn.com/docs/registry/github - GitHub registry mode
- Template files analyzed: `packages/tasks/src/templates/*`
