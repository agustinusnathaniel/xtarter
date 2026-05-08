import type { ProjectProfile, TaskStatus } from '@xtarterize/core'
import { createFileTask } from '@/factory'
import { renderReleaseWorkflow } from '@/templates/workflows/release-yml.js'

function hasReleaseJob(content: string): boolean {
	return /jobs:\s*\n\s*release:/s.test(content)
}

function areStructurallySimilar(existing: string, incoming: string): boolean {
	const existingHasRelease = hasReleaseJob(existing)
	const incomingHasRelease = hasReleaseJob(incoming)
	if (!existingHasRelease && !incomingHasRelease) return false
	if (existingHasRelease && incomingHasRelease) return true
	return false
}

async function checkReleaseWorkflow(
	_profile: string,
	profile: ProjectProfile,
	_filepath: string | null,
	content: string | null,
): Promise<TaskStatus> {
	if (!content) return 'new'
	const expected = renderReleaseWorkflow(profile)
	if (content.trim() === expected.trim()) return 'skip'
	if (areStructurallySimilar(content, expected)) return 'patch'
	return 'conflict'
}

export const releaseWorkflowTask = createFileTask({
	id: 'ci/release',
	label: 'GitHub release workflow',
	group: 'CI/CD',
	applicable: (profile) => profile.hasGitHub,
	filepath: '.github/workflows/release.yml',
	render: (profile, _existing) => renderReleaseWorkflow(profile),
	checkFn: checkReleaseWorkflow,
})
