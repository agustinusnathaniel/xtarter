export type PackageScriptsMap = Record<string, string | undefined>

const PM_SCRIPT_REF_PATTERN = /^(?:pnpm|npm|yarn|bun)(?:\s+run)?\s+(\S+)/
const RUNNER_PATTERN = /^(npx|yarn|bun)(?:\s+)(.+)$/i
const TOOL_PATTERN =
	/^(biome|eslint|oxlint|oxfmt|prettier|rome|tsc|vitest|jest|mocha|vite|webpack|rollup|astro|next|nuxt|plop|knip|commitizen|changeset|ultracite|standard-version|release-it|hygen|depcheck|npm-check-updates|ncu|commit-and-tag-version)(?:\s|$)/i

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

// Tool aliases - canonical tool name maps to known aliases
const TOOL_ALIASES: Record<string, string[]> = {
	release: ['commit-and-tag-version', 'standard-version', 'release-it'],
	lint: ['eslint', 'biome', 'oxlint', 'prettier', 'rome'],
	format: ['oxfmt', 'prettier'],
	test: ['vitest', 'jest', 'mocha'],
	typecheck: ['tsc', 'tsc --noEmit'],
	cleanup: ['knip', 'depcheck', 'npm-check-updates', 'ncu'],
	scaffold: ['plop', 'hygen'],
}

// For tools like biome/ultracite, these subcommands are equivalent
const EQUIVALENT_SUBCOMMANDS: Record<string, string[]> = {
	biome: ['check', 'lint', 'format'],
	ultracite: ['check', 'fix'],
	vp: ['lint', 'check', 'fmt', 'staged'],
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

// EquivalenceRule: returns true (equivalent), false (not equivalent), or null (continue to next rule)
type EquivalenceRule = {
	name: string
	check: (ctx: EquivalenceContext) => boolean | null
}

type EquivalenceContext = {
	normA: string
	normB: string
	isCompositeA: boolean
	isCompositeB: boolean
	hasShellOpA: boolean
	hasShellOpB: boolean
	toolA: string | null
	toolB: string | null
	argsA: string
	argsB: string
	refA: string | null
	refB: string | null
}

function buildContext(a: string, b: string): EquivalenceContext {
	const normA = normalizeCommand(a)
	const normB = normalizeCommand(b)
	const isCompositeA = isCompositeCommand(normA)
	const isCompositeB = isCompositeCommand(normB)
	const hasShellOpA = /[&|;]/.test(a)
	const hasShellOpB = /[&|;]/.test(b)
	const toolA = extractTool(normA)
	const toolB = extractTool(normB)
	const argsA = normA.slice(toolA?.length ?? 0)
	const argsB = normB.slice(toolB?.length ?? 0)
	const refA = extractScriptRef(normA)
	const refB = extractScriptRef(normB)

	return {
		normA,
		normB,
		isCompositeA,
		isCompositeB,
		hasShellOpA,
		hasShellOpB,
		toolA,
		toolB,
		argsA,
		argsB,
		refA,
		refB,
	}
}

const EQUIVALENCE_RULES: EquivalenceRule[] = [
	{
		name: 'exact-match',
		check: (ctx) => {
			if (ctx.normA === ctx.normB) return true
			return null
		},
	},
	{
		name: 'composite-same-tasks',
		check: (ctx) => {
			if (ctx.isCompositeA && ctx.isCompositeB) {
				return (
					extractCompositeTasks(ctx.normA) === extractCompositeTasks(ctx.normB)
				)
			}
			return null
		},
	},
	{
		name: 'composite-mixed-reject',
		check: (ctx) => {
			if (ctx.isCompositeA || ctx.isCompositeB) {
				return false
			}
			return null
		},
	},
	{
		name: 'shell-operator-mismatch',
		check: (ctx) => {
			if (ctx.hasShellOpA !== ctx.hasShellOpB) {
				return false
			}
			return null
		},
	},
	{
		name: 'tool-mismatch',
		check: (ctx) => {
			if (ctx.toolA === null || ctx.toolB === null) return false
			if (normalizeTool(ctx.toolA) !== normalizeTool(ctx.toolB)) return false
			return null
		},
	},
	{
		name: 'same-tool-same-args',
		check: (ctx) => {
			const normalizeArgs = (args: string) =>
				args.replace(/(\s+\.)?\s*$/, '').trim()
			if (normalizeArgs(ctx.argsA) === normalizeArgs(ctx.argsB)) return true
			return null
		},
	},
	{
		name: 'equivalent-subcommands',
		check: (ctx) => {
			if (!ctx.toolA) return null
			const equivSubcommands = EQUIVALENT_SUBCOMMANDS[ctx.toolA.toLowerCase()]
			if (!equivSubcommands) return null
			const subcommandPattern = new RegExp(
				`^(${equivSubcommands.join('|')})\\s*`,
			)
			const normalizeArgs = (args: string) =>
				args
					.replace(subcommandPattern, '')
					.replace(/^--write\s*/, '')
					.trim()
			return normalizeArgs(ctx.argsA) === normalizeArgs(ctx.argsB)
		},
	},
	{
		name: 'script-ref-mismatch',
		check: (ctx) => {
			if (ctx.refA !== null && ctx.refB !== null) {
				return ctx.refA === ctx.refB
			}
			if (ctx.refA !== null || ctx.refB !== null) {
				return false
			}
			return null
		},
	},
]

export function areEquivalent(a: string, b: string): boolean {
	const ctx = buildContext(a, b)

	for (const rule of EQUIVALENCE_RULES) {
		const result = rule.check(ctx)
		if (result !== null) {
			return result
		}
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
