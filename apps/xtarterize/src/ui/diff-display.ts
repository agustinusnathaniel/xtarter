import type { FileDiff } from '@xtarterize/core'
import { formatDiffHeader, generateDiff, pc } from '@xtarterize/core'
import Table from 'cli-table3'

export function displayDiffs(diffs: FileDiff[]): void {
	if (diffs.length === 0) return

	// Summary table
	const table = new Table({
		head: [pc.bold('Action'), pc.bold('File')],
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

	for (const diff of diffs) {
		const isNew = diff.before === null
		table.push([
			isNew ? pc.green('create') : pc.yellow('modify'),
			diff.filepath,
		])
	}

	console.log('')
	console.log(pc.bold('Files to change'))
	console.log('')
	console.log(table.toString())
	console.log('')

	// Individual diffs
	for (const diff of diffs) {
		console.log(pc.bold(formatDiffHeader(diff.filepath, diff.before === null)))
		console.log('')
		console.log(generateDiff(diff.before, diff.after))
		console.log('')
	}
}
