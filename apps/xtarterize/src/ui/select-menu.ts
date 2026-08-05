import { multiselect } from '@clack/prompts'
import type { Task, TaskStatus } from '@xtarterize/core'
import { abortIfCancelled } from '@xtarterize/core'
import { statusHint } from '@/utils/display.js'

export async function selectTasks(
	tasks: Task[],
	statuses: Map<string, TaskStatus>,
): Promise<string[]> {
	const options = tasks.map((task) => ({
		value: task.id,
		label: `${task.label} (${task.id})`,
		hint: statusHint(statuses.get(task.id)),
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

	abortIfCancelled(selected)

	if (Array.isArray(selected)) {
		return selected as string[]
	}

	return []
}
