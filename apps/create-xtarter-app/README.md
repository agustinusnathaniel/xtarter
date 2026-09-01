# create-xtarter-app

> Scaffold JavaScript and TypeScript projects from curated starter templates

[![npm version](https://img.shields.io/npm/v/create-xtarter-app.svg)](https://www.npmjs.com/package/create-xtarter-app)
[![npm downloads](https://img.shields.io/npm/dm/create-xtarter-app.svg)](https://www.npmjs.com/package/create-xtarter-app)
[![License](https://img.shields.io/npm/l/create-xtarter-app.svg)](https://github.com/agustinusnathaniel/xtarterize/blob/main/LICENSE)

`create-xtarter-app` downloads a starter template, updates its project name,
installs dependencies, and optionally initializes Git. It supports Node.js 24+
and does not require Git to download a template.

## Quick start

```bash
# Interactive
npx create-xtarter-app@latest

# Fully non-interactive
npx create-xtarter-app@latest my-app \
  --template vite-tailwind --pm pnpm --no-git --yes

# Preview a template
npx create-xtarter-app@latest preview vite-tailwind
```

## CLI

```text
npx create-xtarter-app@latest [project-name] [options]
```

| Option | Alias | Description |
| --- | --- | --- |
| `--template <id>` | `-t` | Select a template without prompting |
| `--pm <manager>` | `-p` | Use `pnpm`, `npm`, `bun`, or `yarn` |
| `--no-git` | | Skip Git initialization |
| `--clean` | | Remove supported CI/CD configuration files |
| `--force` | `-f` | Overwrite a non-empty target directory |
| `--ref <ref>` | | Download a branch, tag, or commit |
| `--yes` | `-y` | Skip selection prompts and use defaults |
| `--quiet` | | Suppress progress and decorative output |
| `--json` | | Print the result as JSON |
| `--no-color` | | Disable colorized output |

The project name has no default. Pass one when using `--yes` for a fully
non-interactive run. Without it, the CLI still prompts for a name.

Run `preview` with a template ID to print its description, repository, branch,
features, and example command. See the [CLI reference](https://xtarter.sznm.dev/create-xtarter-app/guide/cli/)
for the complete option and error reference.

## Templates

| ID | Stack |
| --- | --- |
| `next-chakra` | Next.js 16, Chakra UI v3, Biome, Turborepo, TypeScript, Playwright |
| `next-tailwind` | Next.js 16, Tailwind CSS v4, Biome, TypeScript, Playwright |
| `vite-chakra` | Vite+ 8, React 19, TanStack Router, TanStack Query, Chakra UI v3, Biome, Vitest |
| `vite-tailwind` | Vite+ 8, React 19, TanStack Router, TanStack Query, Tailwind CSS v4, Biome, Vitest |
| `vite-hero` | Vite+ 8, React 19, TanStack Router, Hero UI, Biome, Vitest |

All templates include strict TypeScript, GitHub Actions, VS Code settings, and
agent skills. Their source repositories are listed in the [template catalog](https://xtarter.sznm.dev/create-xtarter-app/guide/templates/).

## Programmatic API

The package exports the scaffold helpers and template registry for scripts:

```typescript
import { downloadTemplateFiles, getTemplateById } from 'create-xtarter-app'

const template = getTemplateById('vite-tailwind')
if (!template) throw new Error('Unknown template')

await downloadTemplateFiles({
  targetPath: './my-app',
  template,
})
```

## Development

From the monorepo root:

```bash
pnpm install
pnpm --filter create-xtarter-app build
pnpm --filter create-xtarter-app typecheck
pnpm --filter create-xtarter-app test
```

See the root [README](../../README.md) for workspace conventions and the
[architecture decisions](../../docs/ADRs/create-xtarter-app/).

## License

MIT
