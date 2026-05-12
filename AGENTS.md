# Agent Workflow

> This is the mandatory entry point for any AI agent working on `xtarterize`. Read this entire file before planning or writing any code.

`xtarterize` is a CLI tool that scans JavaScript/TypeScript projects and applies production-grade conformance configurations (linting, type checking, CI, editor settings, etc.) via a task-based engine. It is a **pnpm monorepo** with Turborepo orchestration.

## 1. Understand the Project and Current State

Before proposing any change:

- Read `README.md` to understand the product, supported stacks, and high-level architecture.
- Run `git pull` first and check the latest commits to see recent changes and avoid conflicts.
- Read `package.json` and `turbo.json` to understand workspace scripts, dependencies, and task pipelines.
- Review the monorepo structure:
  - `packages/core/` — project detection, task interface, file utilities, resolve/apply/backup engine
  - `packages/patchers/` — JSON merge, YAML merge, AST patching (magicast)
  - `packages/tasks/` — all task implementations and template renderers
  - `apps/xtarterize/` — CLI entry point using citty + @clack/prompts
  - `apps/create-xtarter-app/` — project scaffolding CLI (Next.js/Vite templates)
  - `apps/docs/` — Astro + Starlight documentation site
  - `test/` — shared test fixtures and test suites
- **Check recent changes** to understand the current implementation state:
  ```bash
  git log --oneline -20
  git diff --name-only HEAD~5..HEAD
  ```
- Review any open or related files in the current context before modifying them.

## 2. Understand the Problem

- Read the linked issue, PR description, or task thoroughly.
- Identify the acceptance criteria. If they are ambiguous, ask for clarification before coding.
- Determine which package(s) are affected: core, patchers, tasks, xtarterize, create-xtarter-app, or docs.
- Map the problem to existing abstractions (Task interface, patchers, detection engine) before inventing new ones.

## 3. Read the Architecture Decision Records (ADRs)

All significant architectural decisions are recorded in `docs/ADRs/`. You **must** read any ADR relevant to your change before implementation.

| Scope | Location |
|-------|----------|
| Monorepo-level (infra, release, workspace) | `docs/ADRs/` |
| xtarterize CLI (detection, patchers, tasks, CI) | `docs/ADRs/xtarterize/` |
| create-xtarter-app (scaffolding) | `docs/ADRs/create-xtarter-app/` |

Read any ADR relevant to your change before implementation.

If your change introduces a new architectural pattern, dependency, or structural change, **create a new ADR** following the existing format (Status, Date, Context, Decision, Rationale, Alternatives, Consequences).

## 4. Be Pragmatic — Reuse Before Reinventing

- Search the existing codebase for utilities, patterns, or tasks that already solve similar problems.
- Check `packages/core/src/` for utilities (file I/O, package.json reading, path resolution) before writing new helpers.
- Check `packages/patchers/src/` for existing merge/patch strategies.
- Check `packages/tasks/src/` for existing task implementations that can serve as a reference.
- Prefer wrapping, composing, or extending existing libraries over building from scratch.
- If introducing a new dependency, justify it in your reasoning and ensure it aligns with the project's philosophy (lightweight, ecosystem-standard, no runtime bloat).

## 5. Implement with Comprehensive Testing and Validation

Every code change must pass the full quality pipeline:

```bash
# Run tests
vp test

# Type check all packages
pnpm typecheck

# Build all packages
pnpm build

# Lint and format checks
pnpm lint
pnpm check
```

- Add or update tests in `test/` for any new behavior, especially for:
  - New tasks in `test/tasks/`
  - Patcher changes in `test/patchers/`
  - Core engine changes in `test/core/`
- Ensure your changes are **idempotent** — running the same operation twice should produce the same result.
- Ensure tasks follow the `Task` interface correctly: `applicable`, `check`, `dryRun`, `apply`.
- For CLI changes, verify commands work in both dry-run and apply modes.

## 6. Dependency Updates

When updating dependencies, follow this workflow to avoid breaking changes:

```bash
# 1. Check what can be updated (minor/patch only; major versions require individual review)
npx taze -r

# 2. Apply safe updates (minor + patch)
npx taze minor --write -r

# 3. Manually bump any non-semver-tracked packages (e.g., @tailwindcss/vite pinned in apps/docs/package.json)
# DO NOT blindly update packages known to break the build. See locked versions below.

# 4. Install and dedupe
pnpm install
pnpm dedupe

# 5. Run full verification pipeline
pnpm typecheck
pnpm build
vp test
pnpm lint
```

### Known Locked / Problematic Packages

| Package             | Locked Version | Reason                                                                                                          |
| ------------------- | -------------- | --------------------------------------------------------------------------------------------------------------- |
| `@tailwindcss/vite` | `4.2.2`        | `4.2.4` breaks Vite 8 build with `Missing field tsconfigPaths on BindingViteResolvePluginConfig.resolveOptions` |

If a dependency update causes any of the verification steps to fail, revert that specific package to its previous working version rather than trying to fix the breakage inline.

## 7. Commit Your Work

After implementation and testing are complete, commit the changes:

- Review all modified files with `git diff` and `git status` before committing.
- **Split into multiple commits** if the change spans unrelated concerns (e.g., core engine fix + new task + docs update should be separate commits).
- Include documentation updates in the same commit when they belong to the same logical change.
- **If unsure whether to commit or not, ask the user first.** Do not commit secrets, temporary files, or unrelated changes.
- Write clear commit messages following the project's convention (Conventional Commits).

## 8. Update Documentation

If your change affects behavior, architecture, or user-facing features, update the relevant documentation:

- **Internal decisions**: Add or update ADRs in the appropriate `docs/ADRs/` subdirectory (monorepo-level in `docs/ADRs/`, xtarterize-specific in `docs/ADRs/xtarterize/`, create-xtarter-app-specific in `docs/ADRs/create-xtarter-app/`).
- **Publishable docs**: Update the Astro Starlight site in `apps/docs/src/content/docs/`:
  - CLI commands or behavior changes → `apps/docs/src/content/docs/guide/cli/`
  - Task system or contributing changes → `apps/docs/src/content/docs/contributing/`
  - Configuration or setup changes → `apps/docs/src/content/docs/getting-started/`
- Preview doc changes locally:
  ```bash
  pnpm docs:dev
  ```
- Ensure `pnpm docs:build` passes without errors before finishing.

## Quick Reference

| Concern                | Location                                            |
| ---------------------- | --------------------------------------------------- |
| Project overview       | `README.md`                                         |
| Architecture decisions | `docs/ADRs/`                                        |
| Import conventions     | `docs/ADRs/xtarterize/013-dynamic-import-conventions.md` |
| Vite Plus migration    | `docs/ADRs/xtarterize/014-vite-plus-migration.md`   |
| pnpm catalog policy    | `docs/ADRs/015-pnpm-catalog-shared-dependencies.md` |
| Task interface         | `packages/core/src/_base.ts`                        |
| Core utilities         | `packages/core/src/`                                |
| Patching engine        | `packages/patchers/src/`                            |
| Task implementations   | `packages/tasks/src/`                               |
| CLI commands           | `apps/xtarterize/src/commands/`                    |
| Publishable docs       | `apps/docs/src/content/docs/`                       |
| Scaffolding CLI        | `apps/create-xtarter-app/src/`                      |
| Tests                  | `test/`                                             |
| Workspace scripts      | Root `package.json`                                 |

---

**Do not skip these steps.** The quality of your work is measured by how well you follow this workflow, not just by the code you produce.

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `pnpm check` (Biome) + `pnpm typecheck` (Turborepo) for lint, format, and type checks.
- [ ] Run `vp test` to run tests.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.

<!--VITE PLUS END-->
