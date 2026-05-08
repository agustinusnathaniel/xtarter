import { createSimpleFileTask } from '@/factory'
import { renderCiWorkflow } from '@/templates/workflows/ci-yml.js'

export const ciWorkflowTask = createSimpleFileTask({
	id: 'ci/ci',
	label: 'GitHub CI workflow',
	group: 'CI/CD',
	applicable: (profile) => profile.hasGitHub,
	filepath: '.github/workflows/ci.yml',
	render: (profile) => renderCiWorkflow(profile),
})
