import type { TaskStatus } from '@xtarterize/core'
import { type CheckFnContext, createFileTask } from '@/factory'
import { renderReleaseWorkflow } from '@/templates/workflows/release-yml.js'

function hasReleaseJob(content: string): boolean {
	return /jobs:\s*\n\s+release:/s.test(content)
}

function usesChangesetsAction(content: string): boolean {
	return /changesets\/action@v1/.test(content)
}

async function checkReleaseWorkflow({
	profile,
	content,
}: CheckFnContext): Promise<TaskStatus> {
	if (!content) return 'new'

	const expected = renderReleaseWorkflow(profile, content)

	if (content.trim() === expected.trim()) return 'skip'

	if (profile.existing.changeset) {
		if (usesChangesetsAction(content)) return 'patch'
		if (hasReleaseJob(content)) return 'conflict'
		return 'new'
	}

	if (hasReleaseJob(content)) return 'patch'
	return 'conflict'
}

export const releaseWorkflowTask = createFileTask({
	id: 'ci/release',
	label: 'GitHub release workflow',
	group: 'CI/CD',
	searchMeta: {
		tags: ['ci', 'cd', 'release', 'github-actions'],
		configTargets: ['.github/workflows/release.yml'],
		keywords: [
			'release',
			'publish',
			'npm publish',
			'github release',
			'cd',
			'deploy',
		],
	},
	scope: 'root',
	applicable: (profile) => profile.hasGitHub,
	filepath: '.github/workflows/release.yml',
	render: (profile, existing) => renderReleaseWorkflow(profile, existing),
	checkFn: checkReleaseWorkflow,
})
