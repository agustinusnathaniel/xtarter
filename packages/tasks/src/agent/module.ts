import type { ProjectProfile, Task, TaskStatus } from '@xtarterize/core'
import { createFileTask } from '@/factory'

function detectPresence(
	content: string | null,
	whenPresent: TaskStatus = 'skip',
): TaskStatus {
	if (!content) return 'new'
	return whenPresent
}

export function createAgentPresenceTask(options: {
	id: string
	label: string
	filepath: string
	render: (profile: ProjectProfile) => string
	applicable?: (profile: ProjectProfile) => boolean
	ensureParentDir?: boolean
	whenPresent?: TaskStatus
}): Task {
	return createFileTask({
		id: options.id,
		label: options.label,
		group: 'Agent',
		applicable: options.applicable ?? (() => true),
		filepath: options.filepath,
		render: options.render,
		ensureParentDir: options.ensureParentDir,
		checkFn: async (_cwd, _profile, _fullPath, content) =>
			detectPresence(content, options.whenPresent),
	})
}

export function createAgentGuideTask(options: {
	id: string
	label: string
	filepath: string
	render: (profile: ProjectProfile, existing: string | null) => string
	applicable?: (profile: ProjectProfile) => boolean
	whenPresent?: TaskStatus
}): Task {
	return createFileTask({
		id: options.id,
		label: options.label,
		group: 'Agent',
		applicable: options.applicable ?? (() => true),
		filepath: options.filepath,
		render: options.render,
		checkFn: async (_cwd, _profile, _fullPath, content) =>
			detectPresence(content, options.whenPresent),
	})
}
