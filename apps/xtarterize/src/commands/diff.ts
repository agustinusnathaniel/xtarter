import {
	ensureXtarterizeGitignore,
	type FileDiff,
	logError,
	logSuccess,
} from '@xtarterize/core'
import { defineCommand } from 'citty'
import { displayDiffs } from '@/ui/diff-display.js'
import { mergeFileDiffs } from '@/ui/merge-file-diffs.js'
import { resolveCliContext, scanProject } from '@/utils/project.js'
import { printTiming } from '@/utils/timing-display.js'

export const diffCommand = defineCommand({
	meta: {
		name: 'diff',
		description: 'Show pending changes without applying',
	},
	args: {
		cwd: {
			type: 'string',
			description: 'Target directory (default: current working directory)',
		},
		quiet: {
			type: 'boolean',
			description: 'Suppress verbose output',
		},
		json: {
			type: 'boolean',
			description: 'Output as JSON for machine consumption',
		},
		format: {
			type: 'string',
			description: 'Output format (terminal|json)',
		},
	},
	async run({ args }) {
		const ctx = resolveCliContext(args)
		await ensureXtarterizeGitignore(ctx.cwd)
		const { profile, tasks, statuses, timing } = await scanProject(ctx)

		const diffs: FileDiff[] = []
		for (const task of tasks) {
			const status = statuses.get(task.id)
			if (status === 'new' || status === 'patch') {
				try {
					const taskDiffs = await task.dryRun(ctx.cwd, profile)
					diffs.push(...taskDiffs)
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error)
					logError(`Failed to dryRun ${task.id}: ${message}`)
				}
			}
		}

		const mergedDiffs = mergeFileDiffs(diffs)

		if (mergedDiffs.length === 0) {
			logSuccess('No pending changes')
			if (!ctx.quiet) printTiming(timing)
			return
		}

		displayDiffs(mergedDiffs, ctx.format)
		if (!ctx.quiet) printTiming(timing)
	},
})
