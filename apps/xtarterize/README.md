# xtarterize

Apply production-grade conformance configurations to any JavaScript/TypeScript project in one command.

`xtarterize` detects your tech stack automatically, then applies curated configurations for linting, type checking, CI workflows, code generation, editor settings, and more — without destructively overwriting your existing setup.

## Quick Start

```bash
npx xtarterize init
```

That's it. Your project gets Biome, TypeScript incremental builds, Renovate, commitlint, VS Code settings, GitHub Actions, and more — all tailored to your stack.

## Commands

| Command | Description |
|---------|-------------|
| `npx xtarterize init` | Scan project and apply conformance configurations |
| `npx xtarterize sync` | Update existing configurations to latest templates |
| `npx xtarterize diff` | Show pending changes without applying anything |
| `npx xtarterize check` | Audit current conformance status |
| `npx xtarterize add <task>` | Apply a specific task (e.g., `lint/biome`) |
| `npx xtarterize restore <file>` | Restore a file from backup |
| `npx xtarterize list` | List all available tasks and their status |

## Supported Stacks

| Category | Supported |
|----------|-----------|
| Frameworks | React, React Native, Vue, Svelte, Solid, Node.js |
| Bundlers | Vite, Next.js, Expo, TanStack Start, Webpack, Rspack |
| Styling | Tailwind, Vanilla, CSS Modules, Styled Components, NativeWind, Vanilla Extract |
| Package Managers | pnpm, npm, yarn, bun |

## How It Works

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

## Key Principles

- **Idempotent** — Running twice changes nothing on the second run
- **Non-destructive** — Existing content is preserved via deep merge
- **Dry-run first** — Always see what will change before applying
- **Backup always** — Every modified file is backed up to `.xtarterize/backups/`
- **Real templates** — All configurations derived from actual production projects

## License

MIT
