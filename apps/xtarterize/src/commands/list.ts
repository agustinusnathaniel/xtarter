import { pc } from '@xtarterize/core'
import { defineCommand } from 'citty'
import { resolveCliContext, scanProject } from '@/utils/project.js'

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
		const { profile, tasks, statuses } = await scanProject(ctx)

		if (ctx.json) {
			console.log(
				JSON.stringify({
					ok: true,
					profile: {
						framework: profile.framework,
						bundler: profile.bundler,
						packageManager: profile.packageManager,
						typescript: profile.typescript,
					},
					tasks: tasks.map((task) => ({
						id: task.id,
						label: task.label,
						group: task.group,
						status: statuses.get(task.id) ?? 'new',
					})),
				}),
			)
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

			console.log(`  ${icon} ${task.label.padEnd(40)} ${pc.dim(task.id)}`)
		}

		console.log('')
	},
})
