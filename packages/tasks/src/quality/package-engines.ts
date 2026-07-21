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
	incoming: (_cwd, profile) => {
		const pm = profile.packageManager
		return {
			devEngines: {
				runtime: {
					name: 'node',
					version: '>=20',
				},
				packageManager: {
					name: pm,
					version: pm === 'pnpm' ? '>=9' : '>=10',
				},
			},
		}
	},
})
