import { readPackageJson } from '@xtarterize/core'
import {
	areEquivalent,
	extractTool,
	findEquivalentScriptKey,
} from './equivalence.js'
import type { PackageJsonTaskDep } from './task.js'
import { createPackageJsonTask } from './task.js'

export type LintTool = 'ultracite' | 'biome' | 'oxlint' | 'vp'

export type ScriptEntry = { script: string; value: string }

export function resolveLintTool(params: {
	existingEslint: boolean
	useUltracite: boolean
	hasBiomeDep: boolean
	existingOxlint: boolean
	existingOxfmt: boolean
	vitePlus: boolean
}): LintTool | null {
	if (params.existingEslint) return null
	if (params.useUltracite) return 'ultracite'
	if (params.hasBiomeDep) return 'biome'
	if (params.existingOxlint || params.existingOxfmt) return 'oxlint'
	if (params.vitePlus) return 'vp'
	return 'biome'
}

export function lintToolScripts(
	tool: LintTool | null,
	oxlintPlugins: string,
): ScriptEntry[] {
	switch (tool) {
		case 'ultracite':
			return [
				{ script: 'ultracite:check', value: 'ultracite check' },
				{ script: 'ultracite:fix', value: 'ultracite fix' },
			]
		case 'biome':
			return [
				{ script: 'biome', value: 'biome check .' },
				{ script: 'biome:fix', value: 'biome check --write .' },
			]
		case 'oxlint':
			return [
				{ script: 'lint', value: `oxlint ${oxlintPlugins}` },
				{
					script: 'check',
					value: `oxlint ${oxlintPlugins} && oxfmt --check`,
				},
				{
					script: 'fix',
					value: `oxlint --fix ${oxlintPlugins} && oxfmt`,
				},
			]
		case 'vp':
			return [
				{ script: 'lint', value: 'vp lint' },
				{ script: 'check', value: 'vp check' },
				{ script: 'fix', value: 'vp check --fix' },
			]
		default:
			return []
	}
}

function lintTurboTasks(
	tool: LintTool | null,
	existingScripts: Record<string, string>,
	typescript: boolean,
): string[] {
	const taskKey = tool === 'vp' || tool === 'oxlint' ? 'lint' : (tool ?? '')
	const baseTasks: string[] = tool
		? [tool === 'vp' || tool === 'oxlint' ? 'lint' : tool, 'typecheck', 'test']
		: ['typecheck', 'test']

	let recommendedKeys: string[]
	if (!tool) {
		recommendedKeys = ['typecheck', 'test']
	} else if (tool === 'ultracite') {
		recommendedKeys = ['ultracite:check']
	} else {
		recommendedKeys = baseTasks
	}

	return getCompositeTasks(existingScripts, baseTasks).filter((t) => {
		if (t === 'typecheck' && !typescript) return false
		if (taskKey && t === taskKey && !recommendedKeys.includes(taskKey))
			return false
		return true
	})
}

function oxlintPluginFlags(profile: {
	framework: import('@xtarterize/core').Framework
}): string {
	const plugins = ['--import-plugin']
	if (profile.framework === 'react') {
		plugins.push('--react-plugin', '--jsx-a11y-plugin')
	}
	return plugins.join(' ')
}

function getUpgradeCommand(pm: string): string {
	switch (pm) {
		case 'pnpm':
			return 'pnpm up -i -L'
		case 'yarn':
			return 'yarn upgrade-interactive --latest'
		case 'npm':
			return 'npx npm-check-updates -i'
		case 'bun':
			return 'bun update'
		default:
			return 'npx npm-check-updates -i'
	}
}

type ScriptsMap = Record<string, string>

function pushIfMissing(
	scripts: ScriptEntry[],
	existing: ScriptsMap,
	entry: ScriptEntry,
): void {
	if (
		!Object.hasOwn(existing, entry.script) &&
		!findEquivalentScriptKey(existing, entry.script, entry.value)
	) {
		scripts.push(entry)
	}
}

function pushAllIfMissing(
	scripts: ScriptEntry[],
	existing: ScriptsMap,
	entries: ScriptEntry[],
): void {
	for (const entry of entries) pushIfMissing(scripts, existing, entry)
}

function getCompositeTasks(
	existingScripts: Record<string, string>,
	recommendedKeys: string[],
): string[] {
	const tasks: string[] = []
	for (const key of recommendedKeys) {
		let foundKey: string | null = null
		for (const [existingKey, existingValue] of Object.entries(
			existingScripts,
		)) {
			if (extractTool(existingValue) === key) {
				foundKey = existingKey
				break
			}
		}
		tasks.push(foundKey ?? key)
	}
	return tasks
}

export const packageScriptsTask = createPackageJsonTask({
	id: 'scripts/package-scripts',
	label: 'package.json scripts',
	group: 'Scripts',
	applicable: () => true,
	getScripts: async (cwd, profile) => {
		const pm = profile.packageManager

		const pkg = await readPackageJson(cwd)
		const rawScripts = pkg?.scripts ?? {}
		const existingScripts: ScriptsMap = {}
		for (const [key, value] of Object.entries(rawScripts)) {
			if (value !== undefined) existingScripts[key] = value
		}

		const hasBiomeDep = !!(
			pkg?.devDependencies?.['@biomejs/biome'] ??
			pkg?.dependencies?.['@biomejs/biome']
		)
		const useUltracite = !!(
			pkg?.devDependencies?.ultracite || pkg?.dependencies?.ultracite
		)
		const oxlintPlugins = oxlintPluginFlags(profile)
		const lintTool = resolveLintTool({
			existingEslint: profile.existing.eslint,
			useUltracite,
			hasBiomeDep,
			existingOxlint: profile.existing.oxlint,
			existingOxfmt: profile.existing.oxfmt,
			vitePlus: profile.vitePlus,
		})

		const scripts: ScriptEntry[] = []
		pushAllIfMissing(
			scripts,
			existingScripts,
			lintToolScripts(lintTool, oxlintPlugins),
		)
		pushIfMissing(scripts, existingScripts, {
			script: 'test',
			value: 'vitest run',
		})
		pushIfMissing(scripts, existingScripts, {
			script: 'upgrade',
			value: getUpgradeCommand(pm),
		})

		if (profile.existing.changeset) {
			pushAllIfMissing(scripts, existingScripts, [
				{ script: 'changeset', value: 'changeset' },
				{ script: 'version-packages', value: 'changeset version' },
				{ script: 'release', value: 'changeset publish' },
			])
		} else {
			pushIfMissing(scripts, existingScripts, {
				script: 'release',
				value: 'commit-and-tag-version',
			})
		}

		pushIfMissing(scripts, existingScripts, { script: 'plop', value: 'plop' })

		if (profile.typescript) {
			pushIfMissing(scripts, existingScripts, {
				script: 'typecheck',
				value: 'tsc --noEmit',
			})
			pushIfMissing(scripts, existingScripts, { script: 'knip', value: 'knip' })
		}

		const hasTurbo =
			profile.monorepoTool === 'turbo' ||
			profile.existing.turbo ||
			!!pkg?.devDependencies?.turborepo ||
			!!pkg?.devDependencies?.turbo
		if (hasTurbo) {
			const turboTasks = lintTurboTasks(
				lintTool,
				existingScripts,
				profile.typescript,
			)
			const existingCheckTurbo = existingScripts['check:turbo']
			const newCheckTurboValue = `turbo run ${turboTasks.join(' ')}`
			if (
				!existingCheckTurbo ||
				!areEquivalent(existingCheckTurbo, newCheckTurboValue)
			) {
				scripts.push({ script: 'check:turbo', value: newCheckTurboValue })
			}
		}

		return scripts
	},
	async checkFn(cwd, profile, pkg) {
		const existingScripts = (pkg.scripts as Record<string, string>) ?? {}
		const hasExistingScripts = Object.keys(existingScripts).length > 0

		const pm = profile.packageManager
		const scriptsMap: ScriptsMap = {}
		for (const [key, value] of Object.entries(existingScripts)) {
			if (value !== undefined) scriptsMap[key] = value
		}

		const pkgDeps = pkg.dependencies as Record<string, string> | undefined
		const pkgDevDeps = pkg.devDependencies as Record<string, string> | undefined
		const hasBiomeDep = !!(
			pkgDevDeps?.['@biomejs/biome'] ?? pkgDeps?.['@biomejs/biome']
		)
		const useUltracite = !!(pkgDevDeps?.ultracite || pkgDeps?.ultracite)
		const oxlintPlugins = oxlintPluginFlags(profile)
		const lintTool = resolveLintTool({
			existingEslint: profile.existing.eslint,
			useUltracite,
			hasBiomeDep,
			existingOxlint: profile.existing.oxlint,
			existingOxfmt: profile.existing.oxfmt,
			vitePlus: profile.vitePlus,
		})

		const scripts: ScriptEntry[] = []
		pushAllIfMissing(
			scripts,
			scriptsMap,
			lintToolScripts(lintTool, oxlintPlugins),
		)
		pushIfMissing(scripts, scriptsMap, {
			script: 'test',
			value: 'vitest run',
		})
		pushIfMissing(scripts, scriptsMap, {
			script: 'upgrade',
			value: getUpgradeCommand(pm),
		})

		if (scripts.length === 0) {
			return 'skip'
		}

		return hasExistingScripts ? 'patch' : 'new'
	},
	getDeps: async (cwd, profile) => {
		const deps: PackageJsonTaskDep[] = []

		deps.push({ depName: 'vitest', installDev: true, script: 'test' })

		const pkg = await readPackageJson(cwd)
		const lintTool = resolveLintTool({
			existingEslint: profile.existing.eslint,
			useUltracite: !!(
				pkg?.devDependencies?.ultracite || pkg?.dependencies?.ultracite
			),
			hasBiomeDep: !!(
				pkg?.devDependencies?.['@biomejs/biome'] ??
				pkg?.dependencies?.['@biomejs/biome']
			),
			existingOxlint: profile.existing.oxlint,
			existingOxfmt: profile.existing.oxfmt,
			vitePlus: profile.vitePlus,
		})
		if (
			lintTool === 'biome' &&
			!(
				pkg?.devDependencies?.['@biomejs/biome'] ??
				pkg?.dependencies?.['@biomejs/biome']
			)
		) {
			deps.push({
				depName: '@biomejs/biome',
				installDev: true,
				script: 'biome',
			})
		}

		if (profile.typescript) {
			deps.push({
				depName: 'typescript',
				installDev: true,
				script: 'typecheck',
			})
			deps.push({ depName: 'knip', installDev: true, script: 'knip' })
		}

		if (profile.existing.changeset) {
			deps.push({
				depName: '@changesets/cli',
				installDev: true,
				script: 'changeset',
			})
		} else {
			deps.push({
				depName: 'commit-and-tag-version',
				installDev: true,
				script: 'release',
			})
		}

		deps.push({ depName: 'plop', installDev: true, script: 'plop' })

		return deps
	},
})
