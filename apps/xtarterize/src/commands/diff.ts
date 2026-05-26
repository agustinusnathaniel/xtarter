import { type FileDiff, logSuccess } from '@xtarterize/core'
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
		const { profile, tasks, statuses, timing } = await scanProject(ctx)

		const diffs: FileDiff[] = []
		for (const task of tasks) {
			const status = statuses.get(task.id)
			if (status === 'new' || status === 'patch') {
				const taskDiffs = await task.dryRun(ctx.cwd, profile)
				diffs.push(...taskDiffs)
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
