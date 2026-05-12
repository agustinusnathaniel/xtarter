import type { Task, TaskStatus } from '@xtarterize/core'
import { pc, statusTag } from '@xtarterize/core'
import Table from 'cli-table3'

export function displayPlan(
	tasks: Task[],
	statuses: Map<string, TaskStatus>,
	title = 'Conformance plan',
): void {
	console.log('')
	console.log(pc.bold(title))
	console.log('')

	const table = new Table({
		head: [pc.bold('Status'), pc.bold('Task'), pc.bold('ID'), pc.bold('Group')],
		style: { head: [], border: [] },
		chars: {
			top: '─',
			'top-mid': '┬',
			'top-left': '┌',
			'top-right': '┐',
			bottom: '─',
			'bottom-mid': '┴',
			'bottom-left': '└',
			'bottom-right': '┘',
			left: '│',
			'left-mid': '├',
			mid: '─',
			'mid-mid': '┼',
			right: '│',
			'right-mid': '┤',
			middle: '│',
		},
	})

	for (const task of tasks) {
		const status = statuses.get(task.id) ?? 'new'
		table.push([
			statusTag(status),
			task.label,
			pc.dim(task.id),
			pc.dim(task.group),
		])
	}

	console.log(table.toString())
	console.log('')
}
