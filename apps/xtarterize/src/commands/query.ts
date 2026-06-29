import { scoreTasks } from '@xtarterize/core'
import { defineCommand } from 'citty'
import { formatQueryResult } from '@/ui/json-formatter.js'
import { displayQueryResults } from '@/ui/query-display.js'
import { resolveCliContext, scanProject } from '@/utils/project.js'
import { printTiming } from '@/utils/timing-display.js'

export const queryCommand = defineCommand({
	meta: {
		name: 'query',
		description: 'Search tasks by natural language query',
	},
	args: {
		query: {
			type: 'positional',
			description:
				'Natural language query (e.g. "strict typescript", "ci with linting")',
			required: true,
		},
		limit: {
			type: 'string',
			description: 'Maximum number of results (default: 20)',
		},
		threshold: {
			type: 'string',
			description: 'Minimum relevance score 0-1 (default: 0.1)',
		},
	},
	async run({ args }) {
		const ctx = resolveCliContext(args)
		const { tasks, statuses, timing } = await scanProject(ctx)

		const queryStr = String(args.query)
		const limit = args.limit
			? Math.max(1, parseInt(String(args.limit), 10) || 20)
			: 20
		const threshold = args.threshold
			? Math.min(1, Math.max(0, parseFloat(String(args.threshold)) || 0.1))
			: 0.1

		const results = scoreTasks(tasks, queryStr, {
			maxResults: limit,
			minScore: threshold,
		})

		if (ctx.json) {
			console.log(formatQueryResult({ results, query: queryStr, timing }))
			return
		}

		if (results.length === 0) {
			console.log(`No tasks matched "${queryStr}"`)
			return
		}

		displayQueryResults(results, queryStr, statuses)
		printTiming(timing)
	},
})
