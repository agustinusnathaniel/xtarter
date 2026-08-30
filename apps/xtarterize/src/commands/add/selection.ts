import { groupMultiselect } from '@clack/prompts'
import { statusHint } from '@/utils/display.js'
import type { TaskWithStatus } from './types.js'

export type { TaskWithStatus }

function buildGroupedOptions(
	tasksWithStatus: TaskWithStatus[],
): Record<string, { value: string; label: string }[]> {
	const groups: Record<string, { value: string; label: string }[]> = {}
	for (const entry of tasksWithStatus) {
		const group = entry.task.group
		if (!groups[group]) {
			groups[group] = []
		}
		const hint = statusHint(entry.status)
		groups[group].push({
			value: entry.task.id,
			label: `${entry.task.label} (${entry.task.id})${hint ? ` - ${hint}` : ''}`,
		})
	}
	return groups
}

function getDefaultSelectedIds(tasksWithStatus: TaskWithStatus[]): string[] {
	return tasksWithStatus
		.filter((t) => t.status === 'new' || t.status === 'patch')
		.map((t) => t.task.id)
}

export async function selectTasksGrouped(
	tasksWithStatus: TaskWithStatus[],
): Promise<string[]> {
	const groups = buildGroupedOptions(tasksWithStatus)
	const defaultSelected = getDefaultSelectedIds(tasksWithStatus)

	const selected = await groupMultiselect({
		message: 'Select tasks to add:',
		options: groups,
		initialValues: defaultSelected,
		required: true,
	})

	if (Array.isArray(selected)) {
		return selected as string[]
	}

	return []
}
