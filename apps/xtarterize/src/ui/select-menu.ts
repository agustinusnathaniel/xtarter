import { multiselect } from '@clack/prompts'
import type { Task, TaskStatus } from '@xtarterize/core'

export async function selectTasks(
	tasks: Task[],
	statuses: Map<string, TaskStatus>,
): Promise<string[]> {
	const options = tasks.map((task) => ({
		value: task.id,
		label: `${task.label} (${task.id})`,
		hint: getStatusHint(statuses.get(task.id)),
	}))

	const defaultSelected = tasks
		.filter((t) => {
			const status = statuses.get(t.id)
			return status === 'new' || status === 'patch'
		})
		.map((t) => t.id)

	const selected = await multiselect({
		message: 'Select tasks to apply:',
		options,
		initialValues: defaultSelected,
	})

	if (Array.isArray(selected)) {
		return selected as string[]
	}

	return []
}

function getStatusHint(status?: string): string {
	switch (status) {
		case 'new':
			return 'new file'
		case 'patch':
			return 'needs update'
		case 'skip':
			return 'up to date'
		case 'conflict':
			return 'conflict'
		default:
			return ''
	}
}
