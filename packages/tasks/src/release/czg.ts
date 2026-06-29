import { createPackageJsonTask } from '@/factory'

export const czgTask = createPackageJsonTask({
	id: 'release/czg',
	label: 'czg (commitizen)',
	group: 'Release',
	scope: 'root',
	applicable: () => true,
	scripts: [{ script: 'commit', value: 'czg' }],
	depName: 'czg',
	installDev: true,
})
