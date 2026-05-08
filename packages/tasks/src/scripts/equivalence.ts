type PackageScriptsMap = Record<string, string | undefined>

const PM_SCRIPT_REF_PATTERN = /^(?:pnpm|npm|yarn|bun)(?:\s+run)?\s+(\S+)/
const COMPOSITE_TOOL_PATTERN = /^(turbo|turborepo)(?:\s|$)/i
const TOOL_PATTERN =
	/^(biome|eslint|prettier|rome|tsc|vitest|jest|mocha|vite|webpack|rollup|astro|next|nuxt|plop|knip|commitizen|changeset|ultracite|standard-version|release-it|hygen|depcheck|npm-check-updates|ncu)(?:\s|$)/i

export function normalizeCommand(cmd: string): string {
	return cmd.replace(/\s+/g, ' ').trim()
}

export function extractTool(cmd: string): string | null {
	const norm = normalizeCommand(cmd)
	const toolMatch = norm.match(TOOL_PATTERN)
	if (toolMatch) {
		return toolMatch[1].toLowerCase()
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

export function areEquivalent(a: string, b: string): boolean {
	const normA = normalizeCommand(a)
	const normB = normalizeCommand(b)
	if (normA === normB) return true

	const isCompositeA = isCompositeCommand(normA)
	const isCompositeB = isCompositeCommand(normB)

	if (isCompositeA && isCompositeB) {
		return extractCompositeTasks(normA) === extractCompositeTasks(normB)
	}

	if (isCompositeA || isCompositeB) {
		return false
	}

	const toolA = extractTool(normA)
	const toolB = extractTool(normB)
	return toolA !== null && toolA === toolB
}

export function findEquivalentScriptKey(
	scripts: PackageScriptsMap,
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
