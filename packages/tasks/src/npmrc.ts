import { createSimpleFileTask } from '@/factory'

function npmrcContent(): string {
	return [
		'save-exact=true',
		'strict-peer-dependencies=true',
		'auto-install-peers=true',
		'',
	].join('\n')
}

export const npmrcTask = createSimpleFileTask({
	id: 'scripts/npmrc',
	label: '.npmrc — package manager config',
	group: 'Scripts',
	applicable: () => true,
	filepath: '.npmrc',
	render: () => npmrcContent(),
})
