import { readPackageJson } from '@xtarterize/core'
import {
	areEquivalent,
	extractTool,
	findEquivalentScriptKey,
} from '@/scripts/equivalence.js'
import { createPackageJsonTask } from '@/scripts/task.js'

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

async function hasUltracite(cwd: string): Promise<boolean> {
	const pkg = await readPackageJson(cwd)
	return !!(pkg?.devDependencies?.ultracite || pkg?.dependencies?.ultracite)
}

type ScriptEntry = { script: string; value: string }

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
		const useUltracite = await hasUltracite(cwd)

		const pkg = await readPackageJson(cwd)
		const rawScripts = pkg?.scripts ?? {}
		const existingScripts: Record<string, string> = {}
		for (const [key, value] of Object.entries(rawScripts)) {
			if (value !== undefined) {
				existingScripts[key] = value
			}
		}

		const scripts: ScriptEntry[] = []

		const lintScripts = useUltracite
			? [
					{ script: 'ultracite:check', value: 'ultracite check' },
					{ script: 'ultracite:fix', value: 'ultracite fix' },
				]
			: [
					{ script: 'biome', value: 'biome check .' },
					{ script: 'biome:fix', value: 'biome check --write .' },
				]

		for (const s of lintScripts) {
			const existingKey = findEquivalentScriptKey(
				existingScripts,
				s.script,
				s.value,
			)
			if (!existingKey) {
				scripts.push(s)
			}
		}

		const testScript = { script: 'test', value: 'vitest run' }
		if (
			!findEquivalentScriptKey(
				existingScripts,
				testScript.script,
				testScript.value,
			)
		) {
			scripts.push(testScript)
		}

		const upgradeScript = { script: 'upgrade', value: getUpgradeCommand(pm) }
		if (
			!findEquivalentScriptKey(
				existingScripts,
				upgradeScript.script,
				upgradeScript.value,
			)
		) {
			scripts.push(upgradeScript)
		}

		const releaseScript = { script: 'release', value: 'commit-and-tag-version' }
		if (
			!findEquivalentScriptKey(
				existingScripts,
				releaseScript.script,
				releaseScript.value,
			)
		) {
			scripts.push(releaseScript)
		}

		const plopScript = { script: 'plop', value: 'plop' }
		if (
			!findEquivalentScriptKey(
				existingScripts,
				plopScript.script,
				plopScript.value,
			)
		) {
			scripts.push(plopScript)
		}

		if (profile.typescript) {
			const typecheckScript = { script: 'typecheck', value: 'tsc --noEmit' }
			if (
				!findEquivalentScriptKey(
					existingScripts,
					typecheckScript.script,
					typecheckScript.value,
				)
			) {
				scripts.push(typecheckScript)
			}

			const knipScript = { script: 'knip', value: 'knip' }
			if (
				!findEquivalentScriptKey(
					existingScripts,
					knipScript.script,
					knipScript.value,
				)
			) {
				scripts.push(knipScript)
			}
		}

		const hasTurbo = profile.monorepoTool === 'turbo' || profile.existing.turbo
		if (hasTurbo) {
			const recommendedKeys = useUltracite
				? ['ultracite:check']
				: ['biome', 'typecheck', 'test'].filter((k) => {
						if (k === 'typecheck' && !profile.typescript) return false
						if (
							k === 'biome' &&
							findEquivalentScriptKey(existingScripts, 'biome', 'biome check .')
						)
							return false
						if (
							k === 'typecheck' &&
							findEquivalentScriptKey(
								existingScripts,
								'typecheck',
								'tsc --noEmit',
							)
						)
							return false
						if (
							k === 'test' &&
							findEquivalentScriptKey(existingScripts, 'test', 'vitest run')
						)
							return false
						return true
					})

			const compositeTasks = getCompositeTasks(existingScripts, [
				'biome',
				'typecheck',
				'test',
			]).filter((t) => {
				if (t === 'typecheck' && !profile.typescript) return false
				if (t === 'biome' && !recommendedKeys.includes('biome')) return false
				return true
			})

			const existingCheckTurbo = Object.entries(existingScripts).find(
				([key]) => key === 'check:turbo',
			)
			if (!existingCheckTurbo) {
				scripts.push({
					script: 'check:turbo',
					value: `turbo run ${compositeTasks.join(' ')}`,
				})
			}
		}

		return scripts
	},
})
