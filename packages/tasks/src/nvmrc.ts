import { createFileTask } from '@/factory'

export const nvmrcTask = createFileTask({
	id: 'scripts/nvmrc',
	label: '.nvmrc — Node version pinning',
	group: 'Scripts',
	applicable: () => true,
	filepath: '.nvmrc',
	render: () => 'lts/*\n',
})
