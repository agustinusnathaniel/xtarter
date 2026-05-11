# create-xtarter-app

> Fast project scaffolding for modern web apps

[![npm version](https://img.shields.io/npm/v/create-xtarter-app.svg)](https://www.npmjs.com/package/create-xtarter-app)
[![npm downloads](https://img.shields.io/npm/dm/create-xtarter-app.svg)](https://www.npmjs.com/package/create-xtarter-app)
[![License](https://img.shields.io/npm/l/create-xtarter-app.svg)](LICENSE)

Quickly scaffold new projects from curated starter templates with a beautiful interactive CLI.

## Features

- **Beautiful UI** — Powered by [`@clack/prompts`](https://github.com/bombshell-dev/clack) for a delightful terminal experience
- **Fast Downloads** — Uses [`giget`](https://github.com/unjs/giget) for efficient template downloads (no git dependency required)
- **Type-Safe** — Built with TypeScript for reliability
- **Modern Stack** — Leverages [`tinyexec`](https://github.com/tinylibs/tinyexec) for lightweight process execution
- **Flexible** — Support for multiple templates and package managers
- **Clean Mode** — Optionally remove CI/CD configs for fresh projects

## Quick Start

```bash
# Interactive mode (recommended)
npx create-xtarter-app@latest

# With project name
npx create-xtarter-app@latest my-app

# With template flag
npx create-xtarter-app@latest my-app --template vite-tailwind

# With all options
npx create-xtarter-app@latest my-app -t vite-chakra -p pnpm --no-git
```

## Usage

### Command Line Options

```
Usage:
  npx create-xtarter-app@latest [project-name] [options]

Options:
  --template, -t <name>     Template to use (skips prompt)
  --pm, -p <manager>        Package manager (pnpm|npm|bun|yarn)
  --no-git                  Skip git initialization
  --clean                   Remove CI/CD configs after scaffold
  --help, -h                Show this help message
  --version, -v             Show version number
```

### Available Templates

| Template | Description | Source |
|----------|-------------|--------|
| `next-chakra` | Next.js + Chakra UI v3, Biome, Turborepo | [nextarter-chakra](https://github.com/agustinusnathaniel/nextarter-chakra) |
| `next-tailwind` | Next.js + Tailwind CSS v4 | [nextarter-tailwind](https://github.com/agustinusnathaniel/nextarter-tailwind) |
| `vite-chakra` | Vite + React + Chakra UI v3, TanStack Router | [vite-react-chakra-starter](https://github.com/agustinusnathaniel/vite-react-chakra-starter) |
| `vite-tailwind` | Vite + React + Tailwind CSS v4, TanStack Router | [vite-react-tailwind-starter](https://github.com/agustinusnathaniel/vite-react-tailwind-starter) |
| `vite-hero` | Vite + React + Hero UI | [vite-react-hero-starter](https://github.com/agustinusnathaniel/vite-react-hero-starter) |

### Package Managers

Supported package managers:
- **pnpm** (recommended) — Fast, disk-efficient package management
- **npm** — Default Node.js package manager
- **bun** — Ultra-fast JavaScript runtime and package manager
- **yarn** — Classic alternative

## Examples

### Interactive Mode

Run without arguments for the full interactive experience:

```bash
npx create-xtarter-app@latest
```

You'll be prompted for:
1. Project name
2. Template selection
3. Package manager
4. Git initialization
5. CI/CD config cleanup

### Non-Interactive Mode

Perfect for scripts and automation:

```bash
# Scaffold with vite-tailwind template using pnpm
npx create-xtarter-app@latest my-app -t vite-tailwind -p pnpm --no-git

# Scaffold with defaults (pnpm, git init)
npx create-xtarter-app@latest my-app -t next-chakra --yes
```

### Programmatic Usage

```typescript
import { downloadTemplateFiles, getTemplateById } from 'create-xtarter-app';

const template = getTemplateById('vite-tailwind');
if (template) {
  await downloadTemplateFiles({
    template,
    targetPath: './my-project',
  });
}
```

## What Gets Scaffolded

When you run `create-xtarter-app`, the CLI:

1. **Downloads** the template from GitHub using giget
2. **Updates** `package.json` with your project name
3. **Cleans** CI/CD configs (if `--clean` flag is used)
4. **Installs** dependencies with your chosen package manager
5. **Initializes** a git repository (if `--no-git` is not set)

## Post-Scaffold

After scaffolding, you'll see next steps:

```bash
cd my-app
pnpm dev
```

Then open your browser to the URL shown (usually `http://localhost:3000`).

### Next Step: Apply Production-Grade Configs

Already have a project (from any source) and want to add Biome, CI/CD, Renovate, commitlint, VS Code settings, and more? Check out [**xtarterize**](https://github.com/agustinusnathaniel/xtarterize) — it detects your stack and applies curated configurations non-destructively.

```bash
npx xtarterize init
```

## Related Tools

| Tool | When to Use |
|------|-------------|
| **create-xtarter-app** | Day 0 — Start a new project from a curated template |
| **xtarterize** | Day 1+ — Add production configs to an existing project (any stack) |

> Both tools live in the [xtarterize monorepo](https://github.com/agustinusnathaniel/xtarterize).

## Development

This package is part of the [xtarterize monorepo](https://github.com/agustinusnathaniel/xtarterize). See the root [README](../../README.md) for workspace setup.

```bash
# From the monorepo root:
pnpm install              # Install all workspace dependencies
pnpm cxa:build            # Build create-xtarter-app
pnpm cxa:dev              # Build in watch mode
pnpm cxa:typecheck        # Type check
pnpm cxa:test             # Run tests

# Test scaffolding locally:
node apps/create-xtarter-app/dist/cli.mjs /tmp/my-app -t vite-tailwind --yes
```

## Tech Stack

| Tool | Purpose |
|------|---------|
| [`@clack/prompts`](https://npmjs.com/package/@clack/prompts) | Interactive prompts |
| [`citty`](https://npmjs.com/package/citty) | Command-line argument parsing |
| [`consola`](https://npmjs.com/package/consola) | Console logging |
| [`giget`](https://npmjs.com/package/giget) | Template downloads |
| [`tinyexec`](https://npmjs.com/package/tinyexec) | Process execution |

## Architecture Decisions

See [docs/ADRs/create-xtarter-app/](../../docs/ADRs/create-xtarter-app/) for architectural decision records.

## Why giget over degit?

This CLI uses [`giget`](https://github.com/unjs/giget) instead of the more common `degit` because:

- **Zero dependencies** — No reliance on local git or tar commands
- **Better performance** — Fast cloning using tarball gzip
- **Offline support** — Works offline with disk cache
- **Actively maintained** — Regular updates (degit last update: 2021)
- **Multi-provider** — Works with GitHub, GitLab, Bitbucket, Sourcehut
- **Sparse checkout** — Extract subdirectories without full repo download

## License

MIT © [agustinusnathaniel](https://github.com/agustinusnathaniel)
