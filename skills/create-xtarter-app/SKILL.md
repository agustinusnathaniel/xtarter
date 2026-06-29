---
name: create-xtarter-app
description: Scaffold new JS/TS projects from curated starter templates pre-configured with Biome, TypeScript strict mode, GitHub Actions CI, VS Code settings, and AI agent skills. Use when user wants to create a new project, scaffold an app from a template, or mentions "create-xtarter-app", "npx create-xtarter-app", "scaffold", "starter template", or a template name like "next-tailwind", "vite-chakra", "vite-tailwind", "vite-hero", or "next-chakra".
---

# create-xtarter-app

Scaffolds production-grade JS/TS projects from curated starter templates. Every template ships with Biome, TypeScript strict mode, GitHub Actions CI, VS Code settings, and AI agent skills pre-configured.

## When this skill loads

This skill is activated when the user asks to create a new project, scaffold an app, or mentions a template name. Upon loading:

1. **Determine the stack** — ask the user about their framework (Next.js vs Vite) and UI library preference before picking a template
2. **Use the decision table** — match the user's stack description to the correct template ID
3. **Never guess template names** — only the 5 listed IDs are valid
4. **Check the target directory** — verify it doesn't already exist and isn't non-empty

## Quick reference

```bash
npx create-xtarter-app@latest                          # Interactive mode
npx create-xtarter-app@latest my-app --yes              # Defaults (pnpm, git, no clean, default template)
npx create-xtarter-app@latest my-app --yes --quiet      # Non-interactive, minimal output
npx create-xtarter-app@latest my-app --yes --json        # Non-interactive, JSON result
npx create-xtarter-app@latest my-app -t vite-tailwind   # Specific template
npx create-xtarter-app@latest preview                   # Show all templates
npx create-xtarter-app@latest preview vite-tailwind     # Show one template
```

## Decision parsing: which template to pick

Parse the user's stack description to pick a template:

| If the user says... | They want... | Pick |
|--------------------|-------------|------|
| "Next.js app" + "Chakra UI" | SSR framework + component lib | `next-chakra` |
| "Next.js app" + "Tailwind" | SSR framework + utility CSS | `next-tailwind` |
| "Vite SPA" + "Chakra UI" | Client SPA + component lib | `vite-chakra` |
| "Vite SPA" + "Tailwind" | Client SPA + utility CSS | `vite-tailwind` |
| "Vite SPA" + "Hero UI" | Client SPA + modern UI | `vite-hero` |
| "Next.js" (no UI lib) | SSR framework | Ask "Chakra UI or Tailwind?" |
| "Vite" (no UI lib) | Client SPA | Ask "Chakra UI, Tailwind, or Hero UI?" |
| No framework preference | — | Ask "SSR/static (Next.js) or client SPA (Vite)?" |
| No UI lib preference | — | Show options via `preview` (no args) |

## CLI reference

```bash
npx create-xtarter-app@latest [project-name] [options]
```

| Flag | Short | Description |
|------|-------|-------------|
| `--template <name>` | `-t` | Template ID (skips prompt). **See reference below** |
| `--pm <manager>` | `-p` | Package manager: `pnpm`, `npm`, `bun`, `yarn` |
| `--no-git` | | Skip git init |
| `--clean` | | Remove GitHub Actions CI workflows |
| `--yes` | `-y` | Use defaults: pnpm, git init, no clean. Without `--template`, uses default template |
| `--quiet` | | Suppress banners, spinners, and decorative output |
| `--json` | | Output scaffold result as JSON (also suppresses banners/spinners) |
| `--no-color` | | Disable colorized output |
| `--help` | `-h` | Show help |
| `--version` | `-v` | Show version |

Interactive mode prompts for: project name, template, package manager, git init, clean CI/CD.

### Preview command

```bash
npx create-xtarter-app@latest preview [template-name]
```

Omit template name to list all available templates. Shows description, repo, and branch.

## Available templates

| ID | Name | Stack |
|----|------|-------|
| `next-chakra` | Next.js + Chakra UI | Next.js + Chakra UI v3 |
| `next-tailwind` | Next.js + Tailwind | Next.js + Tailwind CSS v4 |
| `vite-chakra` | Vite + React + Chakra | Vite+ + TanStack Router + Chakra UI v3 |
| `vite-tailwind` | Vite + React + Tailwind | Vite+ + TanStack Router + Tailwind CSS v4 |
| `vite-hero` | Vite + React + Hero UI | Vite+ + TanStack Router + Hero UI |

**MANDATORY — Load** [references/templates.md](references/templates.md) **before using `--template`**. Only these 5 IDs are valid. Inventing template names fails.

## Agent workflows

### Scaffold a new project

```bash
# 1. Determine template from user's stack description (see decision table above)
# 2. Run scaffold
npx create-xtarter-app@latest my-app --template vite-tailwind --pm pnpm --yes
```

After scaffolding, output next steps:

```
cd my-app
pnpm dev
```

To add conformance later: `npx xtarterize init`

### Preview to help user decide

```bash
npx create-xtarter-app@latest preview
# Lists all 5 templates with descriptions

npx create-xtarter-app@latest preview vite-tailwind
# Shows details for one template
```

### CI scaffolding

```bash
npx create-xtarter-app@latest my-app --yes
# Auto-detects CI=true. Uses pnpm, git init, no clean.
```

## Error handling

| Signal | Likely cause | Fix |
|--------|-------------|-----|
| `--template <name>` → "not found" | Wrong name | Run `preview` with no args, use exact ID |
| "Directory exists and not empty" | Target has files | Choose different name or empty dir |
| Download fails | Network | Templates are GitHub-hosted; check connectivity |
| Git init fails | Git not installed | Use `--no-git` |
| `--pm <name>` rejected | Invalid | Only `pnpm`, `npm`, `bun`, `yarn` |
| Install hangs | Lockfile/registry issue | Run install manually in scaffolded dir |

## Anti-patterns

- **NEVER** scaffold into an existing non-empty directory — CLI rejects it
- **NEVER** use `--clean` unless user asks — it removes CI, which is unexpected
- **NEVER** invent template names — only the 5 above. Run `preview` if unsure
- **NEVER** ignore `--pm` if user has a preference — pnpm is default but not universal
