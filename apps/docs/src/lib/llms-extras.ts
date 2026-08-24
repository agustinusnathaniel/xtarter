/**
 * Extra hand-written context appended to the generated llms.txt by the
 * build pipeline's postbuild injector (between markers it owns). This
 * module returns ONLY the inner markdown block: it starts at
 * `## When to use` and ends with a single trailing newline.
 *
 * Determinism contract: pure function of its input, no clock, no
 * randomness, so repeated builds stay byte-identical.
 *
 * Facts verified against the installed CLI sources before writing:
 * - apps/xtarterize/src/commands/init.ts + run-command.ts (sharedRunArgs):
 *   `init` accepts --dry-run, --yes, --only, --skip, --compose,
 *   --format json, --cwd, --quiet, --include-conflicts, --timing.
 * - apps/create-xtarter-app/src/cli.ts (scaffoldArgs): positional project
 *   name plus --template/-t, --pm/-p, --no-git, --clean, --force/-f,
 *   --ref, --yes/-y, --quiet, --json, --no-color.
 */
export function buildLlmsExtras(siteUrl: string): string {
	const base = siteUrl.replace(/\/+$/, '')

	return `## When to use

- Conforming an existing JavaScript/TypeScript repository to a production-grade baseline (Biome, strict TypeScript, CI, editor configs) without overwriting your files: use \`xtarterize\`. It detects the current stack, shows a diff preview of every proposed change, and writes only after you approve.
- Scaffolding a brand-new JavaScript/TypeScript project from a production-grade starter template: use \`create-xtarter-app\`.
- Not for: repos that already have a standard they are happy with (this toolchain does not impose a different one on greenfield projects), and not for languages outside JavaScript/TypeScript.

## How to invoke

Conform an existing project:

\`\`\`
npx xtarterize@latest init
\`\`\`

Useful confirmed flags: \`--dry-run\` (preview changes without applying), \`--yes\` (skip confirmations, apply all), \`--only <task-id>\` and \`--skip <task-id>\` (restrict the plan), \`--compose "<natural language query>"\` (rank tasks by relevance), \`--format json\` (machine-readable output), \`--cwd <dir>\` (target another directory).

Scaffold a new project:

\`\`\`
npx create-xtarter-app@latest <project-name>
\`\`\`

Useful confirmed flags: \`--yes\` (non-interactive defaults), \`--template <id>\` (\`-t\`, pick a starter up front), \`--pm pnpm|npm|bun|yarn\` (\`-p\`, package manager), \`--no-git\`, \`--clean\` (remove CI/CD configs), \`--force\` (overwrite an existing directory), \`--ref <branch-or-tag>\`.

## Machine-readable resources

- [llms.txt entrypoint](${base}/llms.txt)
- [llms-small.txt condensed docs](${base}/llms-small.txt)
- [llms-full.txt complete docs](${base}/llms-full.txt)
- [XML sitemap](${base}/sitemap-index.xml)
- [About this project](${base}/about/)
- [Contact channels](${base}/contact/)
- [Privacy practices](${base}/privacy/)
- [GitHub repository](https://github.com/agustinusnathaniel/xtarterize)
- [xtarterize on npm](https://www.npmjs.com/package/xtarterize)
- [create-xtarter-app on npm](https://www.npmjs.com/package/create-xtarter-app)
`
}
