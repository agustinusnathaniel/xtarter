import {
	detectProject,
	type FileDiff,
	logSuccess,
	resolveTaskStatuses,
	resolveTasks,
	runPreflight,
} from '@xtarterize/core'
import { getAllTasks } from '@xtarterize/tasks'
import { defineCommand } from 'citty'
import { displayDiffs } from '@/ui/diff-display.js'
import { mergeFileDiffs } from '@/ui/merge-file-diffs.js'
import { resolveCwd } from '@/utils/cwd.js'
import { handlePreflightFailure } from '@/utils/preflight.js'
import { resolveRuntimeFlags } from '@/utils/runtime-flags.js'
import { createSpinner } from '@/utils/spinner.js'

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
	},
	async run({ args }) {
		const cwd = resolveCwd(args)
		const { json, quiet } = resolveRuntimeFlags(args)

		const preflight = await runPreflight(cwd)
		handlePreflightFailure(preflight, json)

		const s = createSpinner(quiet)
		s.start('Scanning project...')

		const profile = await detectProject(cwd)
		s.stop('Project scanned')

		const allTasks = getAllTasks()
		const tasks = resolveTasks(profile, allTasks)
		const statuses = await resolveTaskStatuses(tasks, cwd, profile)

		const diffs: FileDiff[] = []
		for (const task of tasks) {
			const status = statuses.get(task.id)
			if (status === 'new' || status === 'patch') {
				const taskDiffs = await task.dryRun(cwd, profile)
				diffs.push(...taskDiffs)
			}
		}

		const mergedDiffs = mergeFileDiffs(diffs)

		if (json) {
			console.log(
				JSON.stringify({
					ok: true,
					count: mergedDiffs.length,
					diffs: mergedDiffs,
				}),
			)
			return
		}

		if (mergedDiffs.length === 0) {
			logSuccess('No pending changes')
			return
		}

		displayDiffs(mergedDiffs)
	},
})
