import { readJsonIfExists, readPackageJson } from '@xtarterize/core'
import { mergeJson, parseJsonc } from '@xtarterize/patchers'
import { createJsonMergeTask, deepEqual, normalizeExtends } from '@/factory'
import { renderBiomeJson } from '@/templates/biome-json.js'

async function hasUltracite(cwd: string): Promise<boolean> {
	const pkg = await readPackageJson(cwd)
	return !!(pkg?.devDependencies?.ultracite || pkg?.dependencies?.ultracite)
}

function getExtendsList(parsed: Record<string, unknown>): string[] {
	const ext = parsed.extends
	if (typeof ext === 'string') return [ext]
	if (Array.isArray(ext)) return ext as string[]
	return []
}

export const biomeTask = createJsonMergeTask({
	id: 'lint/biome',
	label: 'Biome (lint + format)',
	group: 'Linting & Formatting',
	applicable: () => true,
	filepath: 'biome.json',
	extensions: ['.json', '.jsonc'],
	incoming: (_cwd, profile) => JSON.parse(renderBiomeJson(profile)),
	depName: '@biomejs/biome',
	installDev: true,
	async checkFn(cwd, profile, fullPath, content) {
		if (!fullPath || !content) return 'new'

		const parsed = parseJsonc(content) as Record<string, unknown>
		const extendsList = getExtendsList(parsed)
		const hasUltraciteExtends =
			extendsList.includes('ultracite') ||
			extendsList.some((e) => e.startsWith('ultracite/'))

		if (hasUltraciteExtends && (await hasUltracite(cwd))) {
			return 'skip'
		}

		const pkg = await readPackageJson(cwd)
		if (
			!pkg?.devDependencies?.['@biomejs/biome'] &&
			!pkg?.dependencies?.['@biomejs/biome']
		) {
			return 'patch'
		}

		const actual = normalizeExtends((await readJsonIfExists(fullPath)) ?? {})
		const expected = normalizeExtends(JSON.parse(renderBiomeJson(profile)))
		const merged = mergeJson(actual, expected)
		if (deepEqual(actual, merged)) return 'skip'
		return 'patch'
	},
})
