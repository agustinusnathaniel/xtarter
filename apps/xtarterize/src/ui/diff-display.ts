import type { DiffHunk, FileDiff } from '@xtarterize/core'
import { actionTag, formatDiffHeader, pc } from '@xtarterize/core'
import Table from 'cli-table3'

export type DisplayFormat = 'terminal' | 'json'

export function displayDiffs(
	diffs: FileDiff[],
	format: DisplayFormat = 'terminal',
): void {
	if (diffs.length === 0) return

	if (format === 'json') {
		displayJsonDiffs(diffs)
		return
	}

	displayTerminalDiffs(diffs)
}

function displayTerminalDiffs(diffs: FileDiff[]): void {
	const totalStats = computeTotalStats(diffs)

	const table = new Table({
		head: [pc.bold('Action'), pc.bold('File'), pc.bold('Changes')],
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
		const action = actionTag(isNew ? 'create' : 'modify')
		const stats = diff.stats
			? `${pc.green(`+${diff.stats.added}`)} ${pc.red(`-${diff.stats.removed}`)}`
			: ''
		table.push([action, diff.filepath, stats])
	}

	console.log('')
	console.log(pc.bold('Files to change'))
	console.log('')
	console.log(table.toString())

	if (totalStats) {
		console.log(
			`  ${pc.dim('Total:')} ${pc.green(`+${totalStats.added}`)} ${pc.red(`-${totalStats.removed}`)} ${pc.dim('across')} ${pc.bold(String(diffs.length))} ${pc.dim('files')}`,
		)
	}

	console.log('')

	for (const diff of diffs) {
		renderFileDiff(diff)
	}
}

function renderFileDiff(diff: FileDiff): void {
	const isNew = diff.before === null
	const stats = diff.stats
		? `  ${pc.green(`+${diff.stats.added}`)} ${pc.red(`-${diff.stats.removed}`)}`
		: ''

	console.log(pc.bold(formatDiffHeader(diff.filepath, isNew)) + stats)
	console.log('')

	if (diff.hunks) {
		renderHunkDiff(diff.hunks)
	}

	console.log('')
}

function renderHunkDiff(hunks: DiffHunk[]): void {
	for (const hunk of hunks) {
		console.log(pc.cyan(hunk.header))
		for (const line of hunk.lines) {
			if (line.startsWith('+ ')) {
				console.log(pc.green(line))
			} else if (line.startsWith('- ')) {
				console.log(pc.red(line))
			} else {
				console.log(line)
			}
		}
	}
}

function displayJsonDiffs(diffs: FileDiff[]): void {
	const output = buildJsonOutput(diffs)
	console.log(JSON.stringify(output))
}

function buildJsonOutput(diffs: FileDiff[]): JsonOutput {
	const totalStats = computeTotalStats(diffs)

	return {
		ok: true,
		summary: {
			total: diffs.length,
			stats: totalStats ?? undefined,
		},
		files: diffs.map((diff) => ({
			filepath: diff.filepath,
			action: diff.before === null ? 'create' : 'modify',
			stats: diff.stats,
			semantic: diff.semantic,
			hunks: diff.hunks,
			before: diff.before ?? undefined,
			after: diff.after,
		})),
	}
}

interface JsonOutput {
	ok: boolean
	summary: {
		total: number
		stats?: { added: number; removed: number }
	}
	files: {
		filepath: string
		action: 'create' | 'modify'
		stats?: { added: number; removed: number }
		semantic?: {
			added?: Record<string, string>
			removed?: Record<string, string>
			modified?: Record<string, { before: string; after: string }>
		}
		hunks?: {
			header: string
			lines: string[]
			added: number
			removed: number
		}[]
		before?: string
		after: string
	}[]
}

function computeTotalStats(
	diffs: FileDiff[],
): { added: number; removed: number } | undefined {
	let totalAdded = 0
	let totalRemoved = 0
	let hasStats = false
	for (const diff of diffs) {
		if (diff.stats) {
			totalAdded += diff.stats.added
			totalRemoved += diff.stats.removed
			hasStats = true
		}
	}
	return hasStats ? { added: totalAdded, removed: totalRemoved } : undefined
}
