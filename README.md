# xtarter

Production-grade scaffolding and conformance tooling for JavaScript/TypeScript projects.

The **xtarter stack** gives you two complementary tools:

| Tool | Phase | Purpose |
|------|-------|---------|
| [**create-xtarter-app**](https://github.com/agustinusnathaniel/create-xtarter-app) | Day 0 | Scaffold a new project from curated templates with best practices baked in |
| **xtarterize** | Day 1+ | Detect your stack and apply production-grade conformance to any existing project |

## Quick Start

```bash
# Day 0: Scaffold a new project from a template
npx create-xtarter-app@latest my-app

# Day 1+: Add production-grade conformance to any existing project
cd my-app
npx xtarterize init
```

`xtarterize` auto-detects your tech stack, then applies curated configurations for linting, type checking, CI workflows, code generation, editor settings, and more — without destructively overwriting your existing setup.

## Supported Stacks

| Category | Supported |
|----------|-----------|
| Frameworks | React, React Native, Vue, Svelte, Solid, Node.js |
| Bundlers | Vite, Next.js, Expo, TanStack Start, Webpack, Rspack |
| Styling | Tailwind, Vanilla, CSS Modules, Styled Components, NativeWind, Vanilla Extract |
| Package Managers | pnpm, npm, yarn, bun |

## xtarterize Commands

| Command | Description |
|---------|-------------|
| `npx xtarterize init` | Scan project and apply conformance configurations |
| `npx xtarterize sync` | Update existing configurations to latest templates |
| `npx xtarterize diff` | Show pending changes without applying anything |
| `npx xtarterize check` | Audit current conformance status |
| `npx xtarterize add <task>` | Apply a specific task (e.g., `lint/biome`) |
| `npx xtarterize restore <file>` | Restore a file from backup |
| `npx xtarterize list` | List all available tasks and their status |

## How xtarterize Works

1. **Detect** — Reads `package.json`, lockfiles, and config files to build a `ProjectProfile`
2. **Resolve** — Determines which tasks are applicable and their current status (`new`, `patch`, `skip`, `conflict`)
3. **Plan** — Shows you exactly what will change before touching anything
4. **Apply** — Writes configurations using deep merge and AST patching, backing up originals

## Task Categories

- **Linting** — Biome
- **TypeScript** — Incremental builds, strict mode
- **Vite Plugins** — vite-plugin-checker, rollup-plugin-visualizer
- **CI/CD** — GitHub Actions (CI, release, auto-update)
- **Dependencies** — Renovate configuration
- **Release** — commitlint, czg, commit-and-tag-version
- **Quality** — Knip (unused code detection)
- **Codegen** — Plop generators (framework-aware scaffolding)
- **Monorepo** — Turborepo pipeline
- **Editor** — VS Code settings and extensions
- **AI Agents** — AGENTS.md for AI IDE assistants
- **Scripts** — Standardized package.json scripts

## Create an xtarter App Templates

`create-xtarter-app` ships with curated starter templates, each pre-configured with Biome, TypeScript strict mode, GitHub Actions CI, VS Code settings, and AI agent skills:

| Template | Stack |
|----------|-------|
| `next-chakra` | Next.js + Chakra UI v3 |
| `next-tailwind` | Next.js + Tailwind CSS v4 |
| `vite-chakra` | Vite + React + Chakra UI v3 + TanStack Router |
| `vite-tailwind` | Vite + React + Tailwind CSS v4 + TanStack Router |
| `vite-hero` | Vite + React + Hero UI |

## Monorepo Structure

```
xtarterize/
├── packages/
│   ├── core/          # Detection engine, task interface, utils, resolve/apply/backup
│   ├── patchers/      # JSON merge, YAML merge, AST patching (magicast)
│   └── tasks/         # All task implementations + templates
├── apps/
│   ├── xtarterize/     # Conformance CLI (citty + @clack/prompts)
│   └── create-xtarter-app/  # Project scaffolding CLI (citty + giget)
├── test/              # Shared test fixtures and test suites
├── turbo.json
└── pnpm-workspace.yaml
```

### Packages

| Package | Description | Publishable |
|---------|-------------|-------------|
| `@xtarterize/core` | Project detection, task interface, file utilities, resolve/apply/backup engine | Yes |
| `@xtarterize/patchers` | Deep merge (defu), YAML merge, AST patching (magicast) for config files | Yes |
| `@xtarterize/tasks` | All task implementations and template renderers | Internal |
| `xtarterize` | CLI for applying conformance configurations to existing projects | Yes |
| `create-xtarter-app` | CLI for scaffolding new projects from templates | Yes |

## Contributing a New Task

1. Implement the `Task` interface from [`packages/core/src/_base.ts`](packages/core/src/_base.ts)
2. Create your task file in `packages/tasks/src/<category>/<task>.ts`
3. Export it from [`packages/tasks/src/index.ts`](packages/tasks/src/index.ts)
4. Add tests in `test/tasks/`

Each task must implement:
- `applicable(profile)` — Should this task run for this project?
- `check(cwd, profile)` — What's the current status?
- `dryRun(cwd, profile)` — What would change?
- `apply(cwd, profile)` — Make the changes

## Development

```bash
pnpm install          # Install all workspace dependencies
pnpm build            # Build all packages (turbo)
pnpm dev              # Watch mode for all packages
pnpm test             # Run all tests
pnpm typecheck        # Type check all packages
```

## Key Principles

- **Idempotent** — Running twice changes nothing on the second run
- **Non-destructive** — Existing content is preserved via deep merge
- **Dry-run first** — Always see what will change before applying
- **Backup always** — Every modified file is backed up to `.xtarterize/backups/`
- **Real templates** — All configurations derived from actual production projects

## License

MIT
