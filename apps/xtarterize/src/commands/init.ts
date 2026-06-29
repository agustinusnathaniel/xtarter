import type { Task } from '@xtarterize/core'
import { scoreTasks } from '@xtarterize/core'
import { defineCommand } from 'citty'
import { runCommand, sharedRunArgs } from '@/commands/run-command.js'
import { resolveCwd } from '@/utils/cwd.js'
import { getAllTasksWithPlugins, resolveCliContext } from '@/utils/project.js'

export const initCommand = defineCommand({
	meta: {
		name: 'init',
		description: 'Initialize xtarterize conformance for a project',
	},
	args: {
		...sharedRunArgs,
		compose: {
			type: 'string',
			description:
				'Natural language query to compose a targeted task plan (e.g. "strict TypeScript with CI")',
		},
		threshold: {
			type: 'string',
			description: 'Minimum relevance score 0-1 for compose (default: 0.1)',
		},
	},
	async run({ args }) {
		const cwd = resolveCwd(args)
		let orderedTasks: Task[] | undefined

		if (args.compose) {
			const composeQuery = String(args.compose)
			const allTasks = await getAllTasksWithPlugins(cwd)
			const composeThreshold = args.threshold
				? Math.min(1, Math.max(0, parseFloat(String(args.threshold)) || 0.1))
				: 0.1
			const scored = scoreTasks(allTasks, composeQuery, {
				minScore: composeThreshold,
			})

			const rankedIds = new Map(scored.map((r, i) => [r.taskId, i]))
			orderedTasks = [...allTasks].sort((a, b) => {
				const aScore = rankedIds.get(a.id) ?? Infinity
				const bScore = rankedIds.get(b.id) ?? Infinity
				return aScore - bScore
			})

			const ctx = resolveCliContext(args)
			if (!ctx.json) {
				console.log('')
				console.log(`Composing plan for: "${composeQuery}"`)
				if (scored.length > 0) {
					const topTask = scored[0].task
					console.log(
						`Best match: ${topTask.label} (${(scored[0].relevance * 100).toFixed(0)}% relevance)`,
					)
				}
				console.log(`Tasks ranked by relevance across ${scored.length} matches`)
			}
		}

		await runCommand(cwd, args, {
			actionableStatuses: ['new', 'patch', 'conflict'],
			emptyMessage: 'Project is already fully conformant!',
			confirmMessage: 'How would you like to proceed?',
			orderedTasks,
		})
	},
})
