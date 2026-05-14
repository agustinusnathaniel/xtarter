import { createFileTask } from '@/factory'
import { renderKnipConfig } from '@/templates/knip-config.js'

export const knipTask = createFileTask({
	id: 'quality/knip',
	label: 'Knip (unused code detection)',
	group: 'Quality',
	applicable: () => true,
	filepath: 'knip.config',
	extensions: ['.ts', '.mts', '.js', '.json'],
	render: (profile) =>
		renderKnipConfig(profile, profile.typescript ? 'ts' : 'js'),
})
