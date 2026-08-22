import { readPackageJson } from '@xtarterize/core'
import { createJsonMergeTask } from '@/factory'

export const packageEnginesTask = createJsonMergeTask({
	id: 'quality/package-engines',
	label: 'devEngines in package.json',
	group: 'Quality',
	searchMeta: {
		tags: ['quality', 'engines', 'node', 'pnpm', 'package-manager'],
		configTargets: ['package.json'],
		keywords: [
			'devEngines',
			'engines',
			'node version',
			'package manager',
			'pnpm',
			'runtime',
		],
	},
	applicable: () => true,
	scope: 'root',
	filepath: 'package.json',
	incoming: async (cwd, profile) => {
		const pm = profile.packageManager
		const pkg = await readPackageJson(cwd)
		const pmField = pkg?.packageManager as string | undefined
		let pmVersion = pm === 'pnpm' ? '>=9' : '>=10'

		if (pmField) {
			// format: "pnpm@11.8.0" or "npm@10.8.0"
			const atIndex = pmField.indexOf('@')
			if (atIndex !== -1) {
				const version = pmField.slice(atIndex + 1)
				pmVersion = `>=${version}`
			}
		}

		return {
			devEngines: {
				runtime: {
					name: 'node',
					version: `>=${profile.nodeVersion}`,
				},
				packageManager: {
					name: pm,
					version: pmVersion,
				},
			},
		}
	},
})
