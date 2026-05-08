import { createPackageJsonTask } from '@/factory'

export const czgTask = createPackageJsonTask({
	id: 'release/czg',
	label: 'czg (commitizen)',
	group: 'Release',
	applicable: () => true,
	scripts: [{ script: 'commit', value: 'czg' }],
	depName: 'czg',
	installDev: true,
})
