import { createFileTask } from '@/factory'
import { renderCiWorkflow } from '@/templates/workflows/ci-yml.js'

export const ciWorkflowTask = createFileTask({
	id: 'ci/ci',
	label: 'GitHub CI workflow',
	group: 'CI/CD',
	applicable: (profile) => profile.hasGitHub,
	filepath: '.github/workflows/ci.yml',
	render: (profile) => renderCiWorkflow(profile),
})
