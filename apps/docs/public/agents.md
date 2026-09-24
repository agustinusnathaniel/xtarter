# xtarter agent instructions

xtarter is a stack of tools for JavaScript and TypeScript projects: `create-xtarter-app` scaffolds new projects from curated templates, while `xtarterize` conforms existing repositories to a production baseline.

Both CLIs require Node.js 24 or later. `xtarterize` also requires a `package.json` with a `name` field and an initialized Git repository.

## When to use xtarter

- Start a new JavaScript/TypeScript project with `create-xtarter-app`.
- Conform an existing JavaScript/TypeScript repository with `xtarterize`.
- Preview changes before writing with `xtarterize diff` or `xtarterize init --dry-run`; those paths do not create backups, although they may update `.gitignore` with `/.xtarterize/`.
- Interactive `init` and `sync` runs ask before applying. Use `--yes` or `--quiet` for an explicit non-interactive apply path; apply creates backups under `.xtarterize/backups/` before modifying files.
- Keep an existing repository's current standard when it already works.

## How to call the tools

```sh
npx create-xtarter-app@latest <project-name>
npx xtarterize@latest init
```

Any package manager works: replace `npx` with `pnpx` (`pnpm dlx`), `yarn dlx`, `bunx`, `deno x`, or `nlx`.

`xtarterize` run flags (`init`, with most also on `sync`): `--dry-run`, `--yes`, `--only <task-id>`, `--skip <task-id>`, `--compose "<query>"` (`sync` has no `--compose`); `--cwd <dir>` is global. Each command has its own options: `check` and `doctor` do not take `--format`, and `query` rejects `--quiet` and `--format`. `create-xtarter-app` flags: `--yes`, `--template <id>`, `--pm pnpm|npm|bun|yarn`, `--no-git`, `--clean`, `--force`, `--ref <branch-or-tag>`.

## How to consume these docs

Fetch the Markdown twin of any documentation page by appending `.md` to its URL, for example https://xtarter.sznm.dev/xtarterize/guide/cli/overview.md.

- Documentation: https://xtarter.sznm.dev/llms-full.txt (full) and https://xtarter.sznm.dev/llms-small.txt (condensed)
- Sitemap: https://xtarter.sznm.dev/sitemap-index.xml
- npm packages: https://www.npmjs.com/package/xtarterize and https://www.npmjs.com/package/create-xtarter-app
- Source and issues: https://github.com/agustinusnathaniel/xtarter
