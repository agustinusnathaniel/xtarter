import { pc, statusTag } from '@xtarterize/core'
import { defineCommand } from 'citty'
import { formatListResult } from '@/ui/json-formatter.js'
import { resolveCliContext, scanProject } from '@/utils/project.js'
import { printTiming } from '@/utils/timing-display.js'

export const listCommand = defineCommand({
	meta: {
		name: 'list',
		description: 'List all available tasks',
	},
	args: {
		quiet: {
			type: 'boolean',
			description: 'Suppress verbose output',
		},
	},
	async run({ args }) {
		const ctx = resolveCliContext(args)
		const { profile, tasks, statuses, timing } = await scanProject(ctx)

		if (ctx.json) {
			console.log(formatListResult(profile, tasks, statuses, timing))
			return
		}

		let currentGroup = ''

		for (const task of tasks) {
			if (task.group !== currentGroup) {
				currentGroup = task.group
				console.log('')
				console.log(pc.bold(currentGroup))
			}

			const status = statuses.get(task.id) ?? 'new'
			const icon =
				status === 'skip'
					? '✔'
					: status === 'patch'
						? '~'
						: status === 'conflict'
							? '⚠'
							: '✗'

			console.log(
				`  ${icon} ${task.label.padEnd(40)} ${pc.dim(task.id)} ${statusTag(status)}`,
			)
		}

		console.log('')
		printTiming(timing)
	},
})
