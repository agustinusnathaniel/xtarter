// Tool aliases — canonical tool name maps to known aliases
export const TOOL_ALIASES: Record<string, string[]> = {
	release: ['commit-and-tag-version', 'standard-version', 'release-it'],
	lint: ['eslint', 'biome', 'oxlint', 'prettier', 'rome'],
	format: ['oxfmt', 'prettier'],
	test: ['vitest', 'jest', 'mocha'],
	typecheck: ['tsc', 'tsc --noEmit'],
	cleanup: ['knip', 'depcheck', 'npm-check-updates', 'ncu'],
	scaffold: ['plop', 'hygen'],
}

// For tools like biome/ultracite, these subcommands are equivalent
export const EQUIVALENT_SUBCOMMANDS: Record<string, string[]> = {
	biome: ['check', 'lint', 'format'],
	ultracite: ['check', 'fix'],
	vp: ['lint', 'check', 'fmt', 'staged'],
}
