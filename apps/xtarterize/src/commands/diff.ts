import { ensureXtarterizeGitignore, logSuccess } from '@xtarterize/core'
import { defineCommand } from 'citty'
import { displayDiffs } from '@/ui/diff-display.js'
import { mergeFileDiffs } from '@/ui/merge-file-diffs.js'
import { resolveCliContext, scanProject } from '@/utils/project.js'
import { collectTaskDiffs } from '@/utils/task-diffs.js'
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

		const actionableTasks = tasks.filter((task) => {
			const status = statuses.get(task.id)
			return status === 'new' || status === 'patch'
		})
		const { diffs, failures } = await collectTaskDiffs(
			actionableTasks,
			ctx.cwd,
			profile,
		)

		const mergedDiffs = mergeFileDiffs(diffs)

		if (mergedDiffs.length > 0 || failures > 0) {
			process.exitCode = 1
		}

		if (mergedDiffs.length === 0) {
			logSuccess('No pending changes')
			if (!ctx.quiet) printTiming(timing)
			return
		}

		displayDiffs(mergedDiffs, ctx.format)
		if (!ctx.quiet) printTiming(timing)
	},
})
