import type { Task, TaskStatus } from '@xtarterize/core'
import { pc } from '@xtarterize/core'
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
		const colorFn = getStatusColor(status)
		table.push([
			colorFn(getStatusLabel(status)),
			task.label,
			pc.dim(task.id),
			pc.dim(task.group),
		])
	}

	console.log(table.toString())
	console.log('')
}

function getStatusLabel(status: string): string {
	switch (status) {
		case 'new':
			return 'new'
		case 'patch':
			return 'patch'
		case 'skip':
			return 'skip'
		case 'conflict':
			return 'conflict'
		default:
			return status
	}
}

function getStatusColor(status: string): (text: string) => string {
	switch (status) {
		case 'new':
			return pc.green
		case 'patch':
			return pc.yellow
		case 'skip':
			return pc.dim
		case 'conflict':
			return pc.red
		default:
			return (t: string) => t
	}
}
