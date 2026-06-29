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
	searchMeta: {
		tags: ['package-manager', 'config', 'registry'],
		configTargets: ['.npmrc'],
		keywords: [
			'npmrc',
			'npm config',
			'registry',
			'package manager',
			'settings',
		],
	},
	scope: 'root',
	applicable: () => true,
	filepath: '.npmrc',
	render: () => npmrcContent(),
})
