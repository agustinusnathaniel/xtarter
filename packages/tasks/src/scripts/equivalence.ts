type PackageScriptsMap = Record<string, string | undefined>

const PM_SCRIPT_REF_PATTERN = /^(?:pnpm|npm|yarn|bun)(?:\s+run)?\s+(\S+)/
const RUNNER_PATTERN = /^(npx|yarn|bun)(?:\s+)(.+)$/i
const TOOL_PATTERN =
	/^(biome|eslint|prettier|rome|tsc|vitest|jest|mocha|vite|webpack|rollup|astro|next|nuxt|plop|knip|commitizen|changeset|ultracite|standard-version|release-it|hygen|depcheck|npm-check-updates|ncu|commit-and-tag-version)(?:\s|$)/i

export function normalizeCommand(cmd: string): string {
	return cmd.replace(/\s+/g, ' ').trim()
}

export function extractTool(cmd: string): string | null {
	const norm = normalizeCommand(cmd)
	const toolMatch = norm.match(TOOL_PATTERN)
	if (toolMatch) {
		return toolMatch[1].toLowerCase()
	}
	const runnerMatch = norm.match(RUNNER_PATTERN)
	if (runnerMatch) {
		const toolInCmd = runnerMatch[2].match(TOOL_PATTERN)
		if (toolInCmd) {
			return toolInCmd[1].toLowerCase()
		}
	}
	const pmMatch = norm.match(PM_SCRIPT_REF_PATTERN)
	if (pmMatch) {
		return pmMatch[1]
	}
	return null
}

export function extractScriptRef(cmd: string): string | null {
	const norm = normalizeCommand(cmd)
	const match = norm.match(PM_SCRIPT_REF_PATTERN)
	return match ? match[1] : null
}

export function extractCompositeTasks(cmd: string): string | null {
	const norm = normalizeCommand(cmd).toLowerCase()
	const match = norm.match(/turbo\s+run\s+(.+)$/)
	return match ? match[1].trim() : null
}

export function isCompositeCommand(cmd: string): boolean {
	const norm = normalizeCommand(cmd).toLowerCase()
	return norm.startsWith('turbo run') || norm.startsWith('turborepo run')
}

const TOOL_ALIASES: Record<string, string[]> = {
	release: ['commit-and-tag-version', 'standard-version', 'release-it'],
	lint: ['eslint', 'biome', 'prettier', 'rome'],
	test: ['vitest', 'jest', 'mocha'],
	typecheck: ['tsc', 'tsc --noEmit'],
	cleanup: ['knip', 'depcheck', 'npm-check-updates', 'ncu'],
	scaffold: ['plop', 'hygen'],
}

export function normalizeTool(tool: string | null): string | null {
	if (!tool) return null
	for (const [canonical, aliases] of Object.entries(TOOL_ALIASES)) {
		if (aliases.includes(tool.toLowerCase())) {
			return canonical
		}
	}
	return tool?.toLowerCase() ?? null
}

// For tools like biome/ultracite, these subcommands are equivalent
const EQUIVALENT_SUBCOMMANDS: Record<string, string[]> = {
	biome: ['check', 'lint', 'format'],
	ultracite: ['check', 'fix'],
}

export function areEquivalent(a: string, b: string): boolean {
	const normA = normalizeCommand(a)
	const normB = normalizeCommand(b)

	// 1. Exact match
	if (normA === normB) return true

	// Check if composite commands
	const isCompositeA = isCompositeCommand(normA)
	const isCompositeB = isCompositeCommand(normB)

	// 2. Same composite tasks
	if (isCompositeA && isCompositeB) {
		return extractCompositeTasks(normA) === extractCompositeTasks(normB)
	}

	// Don't mix composite with non-composite
	if (isCompositeA || isCompositeB) {
		return false
	}

	// Check for shell operators (if one has shell ops and other doesn't, not equivalent)
	const hasShellOpA = /[&|;]/.test(a)
	const hasShellOpB = /[&|;]/.test(b)
	if (hasShellOpA !== hasShellOpB) {
		return false
	}

	// 3. Same tool (exact match or same category via normalizeTool)
	const toolA = extractTool(normA)
	const toolB = extractTool(normB)
	if (toolA === null || toolB === null) return false
	if (normalizeTool(toolA) !== normalizeTool(toolB)) return false

	// Same tool - compare args (normalize by removing trailing " ." for biome/ultracite)
	const normalizeArgs = (args: string) =>
		args.replace(/(\s+\.)?\s*$/, '').trim()
	const argsA = normalizeArgs(normA.slice(toolA.length))
	const argsB = normalizeArgs(normB.slice(toolB.length))
	if (argsA === argsB) return true

	// For tools with equivalent subcommands, strip them before comparing
	const equivSubcommands = EQUIVALENT_SUBCOMMANDS[toolA.toLowerCase()]
	if (equivSubcommands) {
		const subcommandPattern = new RegExp(
			'^(' + equivSubcommands.join('|') + ')\\s*',
		)
		const normalizeArgs = (args: string) =>
			args
				.replace(subcommandPattern, '')
				.replace(/^--write\\s*/, '')
				.trim()
		return normalizeArgs(argsA) === normalizeArgs(argsB)
	}

	// 4. Same script reference (e.g., "npm run build" === "build" referenced via pnpm)
	const refA = extractScriptRef(normA)
	const refB = extractScriptRef(normB)
	if (refA !== null && refB !== null) {
		return refA === refB
	}
	if (refA !== null || refB !== null) {
		// One references a script, the other doesn't - not equivalent
		return false
	}

	return false
}

export function findEquivalentScriptKey(
	scripts: PackageScriptsMap,
	_script: string,
	targetValue: string,
): string | null {
	for (const [key, value] of Object.entries(scripts)) {
		if (value && areEquivalent(value, targetValue)) {
			return key
		}
	}
	return null
}

export function hasScriptWithEquivalentValue(
	scripts: PackageScriptsMap,
	value: string,
): boolean {
	return Object.values(scripts).some((v) => v && areEquivalent(v, value))
}
