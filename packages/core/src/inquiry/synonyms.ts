export const SYNONYM_MAP: Record<string, string[]> = {
	lint: [
		'linter',
		'static-analysis',
		'analyze',
		'check',
		'quality',
		'style',
		'fmt',
	],
	format: ['formatter', 'style', 'pretty', 'prettify', 'fmt'],
	typescript: [
		'ts',
		'type',
		'types',
		'type-safe',
		'typecheck',
		'strict',
		'typing',
	],
	strict: ['strict-mode', 'type-safe', 'typecheck', 'type-checking'],
	ci: [
		'continuous-integration',
		'github-actions',
		'workflow',
		'pipeline',
		'build',
		'automation',
	],
	editor: ['ide', 'vscode', 'cursor', 'vscodium', 'code'],
	vscode: ['code', 'visual-studio-code', 'cursor', 'vscodium'],
	deps: ['dependencies', 'renovate', 'dependabot', 'updates', 'upgrade'],
	renovate: ['dependabot', 'dependency-updates', 'auto-update'],
	release: [
		'publish',
		'version',
		'changelog',
		'semver',
		'deploy',
		'cut-release',
	],
	quality: ['knip', 'lint-staged', 'pre-commit', 'hook', 'dead-code', 'unused'],
	monorepo: ['turbo', 'workspace', 'multi-package', 'pnpm-workspace'],
	turbo: ['monorepo', 'workspace', 'build-orchestrator'],
	codegen: ['plop', 'scaffold', 'generator', 'generate', 'template'],
	plop: ['codegen', 'scaffold', 'generator'],
	agent: ['ai', 'claude', 'opencode', 'copilot', 'llm', 'assistant'],
	vite: ['bundler', 'build-tool', 'rollup', 'plugin'],
	git: ['commit', 'commitlint', 'husky', 'hook', 'pre-commit', 'czg'],
	nx: ['monorepo', 'build-system', 'dependency-graph'],
	oxlint: ['linter', 'lint', 'static-analysis', 'rust'],
	oxfmt: ['formatter', 'format', 'style', 'rust'],
	biome: ['linter', 'formatter', 'lint', 'format', 'all-in-one'],
	knip: ['dead-code', 'unused-exports', 'tree-shaking'],
	husky: ['git-hooks', 'pre-commit', 'commit-hooks'],
	commitlint: ['commit-message', 'conventional-commits', 'lint-commit'],
	lintstaged: ['lint-staged', 'pre-commit', 'staged-files'],
}

export function expandQuery(tokens: string[]): string[] {
	const expanded = [...tokens]
	const allTokens = tokens.map((t) => t.toLowerCase())

	for (const token of allTokens) {
		const synonyms = SYNONYM_MAP[token]
		if (synonyms) {
			for (const syn of synonyms) {
				if (!expanded.includes(syn)) expanded.push(syn)
			}
		}
		for (const [key, values] of Object.entries(SYNONYM_MAP)) {
			if (values.includes(token)) {
				if (!expanded.includes(key)) {
					expanded.push(key)
				}
				// Transitive expansion: also add this key's synonym values
				const keySynonyms = SYNONYM_MAP[key]
				if (keySynonyms) {
					for (const syn of keySynonyms) {
						if (!expanded.includes(syn)) expanded.push(syn)
					}
				}
			}
		}
	}

	return expanded
}
