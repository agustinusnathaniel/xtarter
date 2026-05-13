import { readPackageJson } from '@xtarterize/core'
import {
	areEquivalent,
	extractTool,
	findEquivalentScriptKey,
} from './equivalence.js'
import type { PackageJsonTaskDep } from './task.js'
import { createPackageJsonTask } from './task.js'

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

function oxlintPluginFlags(profile: {
	framework: import('@xtarterize/core').Framework
}): string {
	const plugins = ['--import-plugin']
	if (profile.framework === 'react') {
		plugins.push('--react-plugin', '--jsx-a11y-plugin')
	}
	return plugins.join(' ')
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
		const useVitePlus = profile.vitePlus
		const hasBiomeDep = !!(
			pkg?.devDependencies?.['@biomejs/biome'] ??
			pkg?.dependencies?.['@biomejs/biome']
		)

		const oxlintPlugins = oxlintPluginFlags(profile)

		const toolScripts: ScriptEntry[] = profile.existing.eslint
			? []
			: useUltracite
				? [
						{ script: 'ultracite:check', value: 'ultracite check' },
						{ script: 'ultracite:fix', value: 'ultracite fix' },
					]
				: hasBiomeDep
					? [
							{ script: 'biome', value: 'biome check .' },
							{ script: 'biome:fix', value: 'biome check --write .' },
						]
					: profile.existing.oxlint || profile.existing.oxfmt
						? profile.vitePlus
							? [
									{ script: 'lint', value: 'vp lint' },
									{ script: 'check', value: 'vp check' },
									{ script: 'fix', value: 'vp check --fix' },
								]
							: [
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
						: useVitePlus
							? [
									{ script: 'lint', value: 'vp lint' },
									{ script: 'check', value: 'vp check' },
									{ script: 'fix', value: 'vp check --fix' },
								]
							: [
									{ script: 'biome', value: 'biome check .' },
									{ script: 'biome:fix', value: 'biome check --write .' },
								]

		for (const s of toolScripts) {
			if (Object.hasOwn(existingScripts, s.script)) {
				continue
			}
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
			!Object.hasOwn(existingScripts, testScript.script) &&
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
			!Object.hasOwn(existingScripts, upgradeScript.script) &&
			!findEquivalentScriptKey(
				existingScripts,
				upgradeScript.script,
				upgradeScript.value,
			)
		) {
			scripts.push(upgradeScript)
		}

		if (profile.existing.changeset) {
			const changesetScripts = [
				{ script: 'changeset', value: 'changeset' },
				{
					script: 'version-packages',
					value: 'changeset version',
				},
				{ script: 'release', value: 'changeset publish' },
			]
			for (const s of changesetScripts) {
				if (
					!Object.hasOwn(existingScripts, s.script) &&
					!findEquivalentScriptKey(existingScripts, s.script, s.value)
				) {
					scripts.push(s)
				}
			}
		} else {
			const releaseScript = {
				script: 'release',
				value: 'commit-and-tag-version',
			}
			if (
				!Object.hasOwn(existingScripts, releaseScript.script) &&
				!findEquivalentScriptKey(
					existingScripts,
					releaseScript.script,
					releaseScript.value,
				)
			) {
				scripts.push(releaseScript)
			}
		}

		const plopScript = { script: 'plop', value: 'plop' }
		if (
			!Object.hasOwn(existingScripts, plopScript.script) &&
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
				!Object.hasOwn(existingScripts, typecheckScript.script) &&
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
				!Object.hasOwn(existingScripts, knipScript.script) &&
				!findEquivalentScriptKey(
					existingScripts,
					knipScript.script,
					knipScript.value,
				)
			) {
				scripts.push(knipScript)
			}
		}

		const hasTurbo =
			profile.monorepoTool === 'turbo' ||
			profile.existing.turbo ||
			!!pkg?.devDependencies?.turborepo ||
			!!pkg?.devDependencies?.turbo
		if (hasTurbo) {
			const lintTool = profile.existing.eslint
				? null
				: useUltracite
					? 'ultracite'
					: hasBiomeDep
						? 'biome'
						: profile.existing.oxlint || profile.existing.oxfmt
							? profile.vitePlus
								? 'vp'
								: 'oxlint'
							: profile.vitePlus
								? 'vp'
								: 'biome'
			const lintTaskKey: string =
				lintTool === 'vp' || lintTool === 'oxlint' ? 'lint' : (lintTool ?? '')

			const recommendedKeys = !lintTool
				? ['typecheck', 'test'].filter((k) => {
						if (k === 'typecheck' && !profile.typescript) return false
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
				: lintTool === 'ultracite'
					? ['ultracite:check']
					: lintTool === 'oxlint'
						? ['lint', 'typecheck', 'test'].filter((k) => {
								if (k === 'typecheck' && !profile.typescript) return false
								if (
									k === 'lint' &&
									findEquivalentScriptKey(existingScripts, 'lint', 'oxlint')
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
						: lintTool === 'biome'
							? ['biome', 'typecheck', 'test'].filter((k) => {
									if (k === 'typecheck' && !profile.typescript) return false
									if (
										k === 'biome' &&
										findEquivalentScriptKey(
											existingScripts,
											'biome',
											'biome check .',
										)
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
										findEquivalentScriptKey(
											existingScripts,
											'test',
											'vitest run',
										)
									)
										return false
									return true
								})
							: ['lint', 'typecheck', 'test'].filter((k) => {
									if (k === 'typecheck' && !profile.typescript) return false
									if (
										k === 'lint' &&
										findEquivalentScriptKey(existingScripts, 'lint', 'vp lint')
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
										findEquivalentScriptKey(
											existingScripts,
											'test',
											'vitest run',
										)
									)
										return false
									return true
								})

			const baseTasks: string[] = lintTool
				? [
						lintTool === 'vp' || lintTool === 'oxlint' ? 'lint' : lintTool,
						'typecheck',
						'test',
					]
				: ['typecheck', 'test']
			const compositeTasks = getCompositeTasks(
				existingScripts,
				baseTasks,
			).filter((t) => {
				if (t === 'typecheck' && !profile.typescript) return false
				if (
					lintTaskKey &&
					t === lintTaskKey &&
					!recommendedKeys.includes(lintTaskKey)
				)
					return false
				return true
			})

			const existingCheckTurbo = Object.entries(existingScripts).find(
				([key]) => key === 'check:turbo',
			)
			const newCheckTurboValue = `turbo run ${compositeTasks.join(' ')}`
			if (
				!existingCheckTurbo ||
				(existingCheckTurbo[1] &&
					!areEquivalent(existingCheckTurbo[1], newCheckTurboValue))
			) {
				scripts.push({
					script: 'check:turbo',
					value: newCheckTurboValue,
				})
			}
		}

		return scripts
	},
	async checkFn(cwd, profile, pkg) {
		const scripts = await this.getScripts?.(cwd, profile)
		const existingScripts = pkg.scripts ?? {}
		const hasExistingScripts = Object.keys(existingScripts).length > 0

		if (scripts?.length === 0) {
			return 'skip'
		}

		return hasExistingScripts ? 'patch' : 'new'
	},
	getDeps: async (cwd, profile) => {
		const deps: PackageJsonTaskDep[] = []

		deps.push({ depName: 'vitest', installDev: true, script: 'test' })

		const useUltracite = await hasUltracite(cwd)
		const pkgForDeps = await readPackageJson(cwd)
		const alreadyHasBiome = !!(
			pkgForDeps?.devDependencies?.['@biomejs/biome'] ??
			pkgForDeps?.dependencies?.['@biomejs/biome']
		)
		const shouldAddBiomeDep =
			!useUltracite &&
			!alreadyHasBiome &&
			!profile.existing.eslint &&
			!profile.existing.oxlint &&
			!profile.existing.oxfmt &&
			!profile.vitePlus
		if (shouldAddBiomeDep) {
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
