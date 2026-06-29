import { createFileTask } from '@/factory'

function npmrcContent(): string {
	return [
		'save-exact=true',
		'strict-peer-dependencies=true',
		'auto-install-peers=true',
		'',
	].join('\n')
}

export const npmrcTask = createFileTask({
	id: 'scripts/npmrc',
	label: '.npmrc — package manager config',
	group: 'Scripts',
	scope: 'root',
	applicable: () => true,
	filepath: '.npmrc',
	render: () => npmrcContent(),
})
