# ADR-018: Published Agent Skills for xtarterize and create-xtarter-app

**Status:** Accepted  
**Date:** 2026-05-19

## Context

AI coding agents (Claude Code, GitHub Copilot, Cline, etc.) increasingly rely on **skills** — markdown files that teach agents how to use specific tools, frameworks, and libraries. The [skills.sh](https://skills.sh) ecosystem provides agent systems with discoverable skill packages that load on-demand.

xtarterize already ships an `agent/skills-install` task that installs third-party skills (shadcn, Next.js, Expo, etc.) into user projects. However, the project itself lacked published skills for its own tools:

- **xtarterize** — agents don't know how to run conformance commands, parse JSON output, or understand task statuses
- **create-xtarter-app** — agents don't know which templates exist, how to scaffold, or how to pick the right template for a user's stack

Without published skills, AI agents interacting with xtarterize or create-xtarter-app must either guess commands or rely on the user to explain the tooling — reducing the value of agent-assisted workflows.

## Decision

Publish two agent skills in the repository root under `skills/`, registered via `.claude-plugin/plugin.json`:

```
skills/
  xtarterize/
    SKILL.md
    references/
      commands.md
      tasks.md
  create-xtarter-app/
    SKILL.md
    references/
      templates.md
.claude-plugin/
  plugin.json
```

### Skill design

Each skill follows the **Tool pattern** with progressive disclosure:

| File | Purpose |
|------|---------|
| `SKILL.md` | Concise (<150 lines) entry point: CLI commands, JSON parsing patterns, agent workflows, anti-patterns, error handling, loading triggers |
| `references/commands.md` | Full flag reference with JSON output shapes (loaded on demand) |
| `references/tasks.md` | Complete task catalog with IDs and applicability conditions (loaded before `add`) |
| `references/templates.md` | Detailed template information (loaded before scaffolding) |

### Agent-first design

Both skills are optimized for AI agent consumption:

- **JSON output by default** — all xtarterize workflows use `--format json`; the skill documents exact output shapes and parsing patterns
- **Decision tables** — "parse this field → to decide next action" patterns for every command
- **MANDATORY loading triggers** — reference files use explicit "MANDATORY — READ ENTIRE FILE" language at the relevant workflow step
- **Do NOT Load guidance** — prevents over-loading context with unnecessary reference files
- **Anti-patterns** — explicit NEVER lists with non-obvious WHY reasoning

### Plugin registry

`.claude-plugin/plugin.json` enables agent systems (Claude Code, etc.) to discover and auto-load these skills:

```json
{
  "name": "xtarter-skills",
  "skills": [
    "./skills/xtarterize",
    "./skills/create-xtarter-app"
  ]
}
```

## Rationale

- **Repository co-location** — skills live alongside the source code they document, reducing drift
- **Standard format** — follows emerging conventions from shadcn/ui (`skills/shadcn/`), ultracite (`skills/ultracite/`), and mattpocock/skills
- **Progressive disclosure** — SKILL.md stays lean (~104-126 lines), details live in reference files loaded on demand
- **Plugin discovery** — `.claude-plugin/plugin.json` allows agent systems to discover skills without manual configuration
- **Complementary to existing system** — the existing `agent/skills-install` task installs third-party skills; these published skills teach agents how to use xtarterize itself

## Alternatives Considered

### Single combined skill
- One SKILL.md covering both tools would overcomplicate loading — agents would always load irrelevant content
- Separate skills allow agents to load only what they need

### External skill repository
- Publishing to a separate repo (like mattpocock/skills) adds maintenance overhead
- Skills would drift from the source code more easily
- No compelling benefit over co-location

### No published skills
- Agents would have no structured knowledge of how to use the tools
- Users would need to explain tool usage manually to agents
- Missed opportunity for the tooling ecosystem

## Consequences

- Skills must be updated when CLI commands, flags, or task catalogs change — update checklist should include `skills/`
- `AGENTS.md` now references `skills/` and `.claude-plugin/` in the monorepo structure
- Future skills (e.g., for `@xtarterize/core` library API) can be added following the same pattern
- Agent systems with plugin discovery will automatically pick up the skills
