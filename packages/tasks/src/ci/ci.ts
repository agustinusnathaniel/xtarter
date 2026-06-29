import { createFileTask } from '@/factory'
import { renderCiWorkflow } from '@/templates/workflows/ci-yml.js'

export const ciWorkflowTask = createFileTask({
	id: 'ci/ci',
	label: 'GitHub CI workflow',
	group: 'CI/CD',
	searchMeta: {
		tags: ['ci', 'testing', 'github-actions', 'quality'],
		configTargets: ['.github/workflows/ci.yml'],
		keywords: [
			'ci',
			'continuous integration',
			'github actions',
			'pipeline',
			'test',
			'build',
		],
	},
	scope: 'root',
	applicable: (profile) => profile.hasGitHub,
	filepath: '.github/workflows/ci.yml',
	render: (profile) => renderCiWorkflow(profile),
})
