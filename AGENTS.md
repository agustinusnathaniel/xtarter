# Agent Workflow

> This is the mandatory entry point for any AI agent working on `xtarterize`. Read this entire file before planning or writing any code.

`xtarterize` is a CLI tool that scans JavaScript/TypeScript projects and applies production-grade conformance configurations (linting, type checking, CI, editor settings, etc.) via a task-based engine. It is a **pnpm monorepo** with Turborepo orchestration.

---

## Values

- **Idempotency is the contract.** Running `check`, `dryRun`, or `apply` twice must produce the same result. If a change breaks idempotency, it is incorrect.
- **Conformance over convenience.** Generated configs must be strict. Never ship a looser default because it's easier.
- **Composition over coupling.** No task assumes another has run. Entangled tasks are split, not orchestrated.
- **Prefer the ecosystem.** Only invent when existing tools can't express the constraint.

---

## Non-Obvious Architecture

- The Task interface is the universal pattern: `applicable()` → `check()` → `dryRun()` → `apply()`. Anything that doesn't fit needs scrutiny.
- JSON/YAML modifications go through `packages/patchers/`. Direct string writes to config files are almost always wrong.
- Package boundaries exist because crossing them created maintenance problems. Core has zero patcher or task deps. `docs` imports from published packages only. `create-xtarter-app` is intentionally isolated.
- ADRs record every significant architecture decision. Read the relevant one before touching architecture.

---

## Workflow

1. **Understand the Project**
   - `git pull`; check recent commits with `git log --oneline -20`
   - Determine which package(s) are affected: core, patchers, tasks, xtarterize, create-xtarter-app, or docs

2. **Understand the Problem**
   - Map the problem to existing abstractions (Task interface, patchers, detection engine) before inventing new ones

3. **Read the ADRs**
   - Read relevant ADRs in `docs/ADRs/` before implementing
   - Create a new ADR (Status, Date, Context, Decision, Rationale, Alternatives, Consequences) if your change introduces new architecture or dependencies

4. **Reuse Before Reinventing**
   - Check `packages/core/src/`, `packages/patchers/src/`, `packages/tasks/src/` before writing new helpers
   - Only introduce a new dependency when no existing abstraction fits

5. **Implementation & Testing**
   - Run `vp test`, `pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm check`
   - Ensure idempotency - running the same operation twice produces the same result
   - Tasks must follow the interface: `applicable`, `check`, `dryRun`, `apply`
   - Add tests in `test/tasks/`, `test/patchers/`, or `test/core/` for new behavior

6. **Dependency Updates**
   - Run `npx taze minor --write -r` for safe updates; `pnpm install && pnpm dedupe` afterward
   - `@tailwindcss/vite` is pinned at 4.2.2 (4.2.4 breaks Vite 8 build)
   - If a dep update fails verification, revert that package - don't fix the breakage inline

7. **Committing**
   - Create a changeset if user-facing: `pnpm changeset`
   - Bump rules: minor for `feat`, patch for everything else, major for breaking
   - Commit with Conventional Commits (feat, fix, refactor, chore, docs, test, style)
   - Split unrelated concerns into separate commits

8. **Documentation**
   - Add or update ADRs in the appropriate `docs/ADRs/` subdirectory
   - Update Starlight docs in `apps/docs/src/content/docs/` if behavior or features change
   - Preview with `pnpm docs:dev`; ensure `pnpm docs:build` passes

---

## Quick Reference

| Concern                | Location                        |
| ---------------------- | ------------------------------- |
| Task interface         | `packages/core/src/_base.ts`    |
| Core utilities         | `packages/core/src/`            |
| Patching engine        | `packages/patchers/src/`        |
| Task implementations   | `packages/tasks/src/`           |
| CLI commands           | `apps/xtarterize/src/commands/` |
| Scaffolding CLI        | `apps/create-xtarter-app/src/`  |
| Publishable docs       | `apps/docs/src/content/docs/`   |
| Architecture decisions | `docs/ADRs/`                    |
| Tests                  | `test/`                         |
