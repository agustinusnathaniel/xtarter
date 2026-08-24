# xtarter agent instructions

xtarter is a stack of tools for JavaScript and TypeScript projects: `create-xtarter-app` scaffolds new projects from curated templates, while `xtarterize` brings existing repositories up to a production-grade conformance baseline.

## When to use xtarter

- Start a new JavaScript/TypeScript project with `create-xtarter-app`.
- Conform an existing JavaScript/TypeScript repository with `xtarterize`.
- Preview changes before writing with `xtarterize init --dry-run`.
- Prefer another standard when an existing repository already has one it is happy with.

## How to call the tools

```sh
npx create-xtarter-app@latest <project-name>
npx xtarterize@latest init
```

Useful `xtarterize` flags include `--dry-run`, `--yes`, `--only <task-id>`, `--skip <task-id>`, `--compose "<natural language query>"`, `--format json`, and `--cwd <dir>`. Useful `create-xtarter-app` flags include `--yes`, `--template <id>`, `--pm pnpm|npm|bun|yarn`, `--no-git`, `--clean`, `--force`, and `--ref <branch-or-tag>`.

## How to consume these docs

Header-based Markdown negotiation (`Accept: text/markdown`) is available on Cloudflare Pages. On other static hosts, fetch the `.md` twin directly.

- Complete documentation: https://xtarter.sznm.dev/llms-full.txt
- Condensed index: https://xtarter.sznm.dev/llms-small.txt
- Per-page Markdown twins at `<page>.md`, for example https://xtarter.sznm.dev/xtarterize/guide/cli/overview.md
- Sitemap: https://xtarter.sznm.dev/sitemap-index.xml
- Robots policy: https://xtarter.sznm.dev/robots.txt
- Documentation site: https://xtarter.sznm.dev/
- npm packages: https://www.npmjs.com/package/xtarterize and https://www.npmjs.com/package/create-xtarter-app
- Source repository: https://github.com/agustinusnathaniel/xtarter
- Issue tracker: https://github.com/agustinusnathaniel/xtarter/issues
