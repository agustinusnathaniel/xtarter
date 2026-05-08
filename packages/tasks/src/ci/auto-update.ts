import { createSimpleFileTask } from '@/factory'
import { renderAutoUpdateWorkflow } from '@/templates/workflows/auto-update-yml.js'

export const autoUpdateWorkflowTask = createSimpleFileTask({
	id: 'ci/auto-update',
	label: 'GitHub auto-update workflow',
	group: 'CI/CD',
	applicable: (profile) => profile.hasGitHub,
	filepath: '.github/workflows/auto-update.yml',
	render: (profile) => renderAutoUpdateWorkflow(profile),
})
