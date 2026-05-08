import { createSimpleFileTask } from '@/factory'

export const nvmrcTask = createSimpleFileTask({
	id: 'scripts/nvmrc',
	label: '.nvmrc — Node version pinning',
	group: 'Scripts',
	applicable: () => true,
	filepath: '.nvmrc',
	render: () => 'lts/*\n',
})
