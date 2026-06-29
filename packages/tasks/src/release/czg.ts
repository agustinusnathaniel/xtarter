import { createPackageJsonTask } from '@/factory'

export const czgTask = createPackageJsonTask({
	id: 'release/czg',
	label: 'czg (commitizen)',
	group: 'Release',
	searchMeta: {
		tags: ['commit', 'cli', 'conventional-commits', 'interactive'],
		configTargets: ['package.json'],
		keywords: [
			'czg',
			'commitizen',
			'commit',
			'conventional commits',
			'interactive',
		],
	},
	scope: 'root',
	applicable: () => true,
	scripts: [{ script: 'commit', value: 'czg' }],
	depName: 'czg',
	installDev: true,
})
