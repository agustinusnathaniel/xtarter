import { createFileTask } from '@/factory'
import { renderAutoUpdateWorkflow } from '@/templates/workflows/auto-update-yml.js'

export const autoUpdateWorkflowTask = createFileTask({
	id: 'ci/auto-update',
	label: 'GitHub auto-update workflow',
	group: 'CI/CD',
	searchMeta: {
		tags: ['ci', 'dependencies', 'maintenance', 'github-actions'],
		configTargets: ['.github/workflows/auto-update.yml'],
		keywords: [
			'auto update',
			'dependency update',
			'renovate',
			'dependabot',
			'schedule',
		],
	},
	scope: 'root',
	applicable: (profile) => profile.hasGitHub,
	filepath: '.github/workflows/auto-update.yml',
	render: (profile) => renderAutoUpdateWorkflow(profile),
})
