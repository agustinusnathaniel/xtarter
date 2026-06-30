import {
	detectPackageManager,
	runPreflight,
	scoreTasks,
	tokenize,
} from '@xtarterize/core'
import { defineCommand } from 'citty'
import { formatQueryResult } from '@/ui/json-formatter.js'
import { displayQueryResults } from '@/ui/query-display.js'
import { handlePreflightFailure } from '@/utils/preflight.js'
import { getAllTasksWithPlugins, resolveCliContext } from '@/utils/project.js'

export const queryCommand = defineCommand({
	meta: {
		name: 'query',
		description: 'Search tasks by natural language query',
	},
	args: {
		cwd: {
			type: 'string',
			description: 'Target directory (default: current working directory)',
		},
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
		const preflight = await runPreflight(ctx.cwd)
		handlePreflightFailure(preflight, ctx.json)
		const tasks = await getAllTasksWithPlugins(ctx.cwd)

		const queryStr = String(args.query)
		const limit =
			args.limit !== undefined
				? Math.max(1, parseInt(String(args.limit), 10) || 20)
				: 20
		const threshold =
			args.threshold !== undefined
				? Math.min(1, Math.max(0, parseFloat(String(args.threshold)) || 0.1))
				: 0.1

		const results = scoreTasks(tasks, queryStr, {
			maxResults: limit,
			minScore: threshold,
		})

		if (ctx.json) {
			console.log(formatQueryResult({ results, query: queryStr }))
			return
		}

		if (results.length === 0) {
			const { tokens } = tokenize(queryStr)
			if (tokens.length === 0 && queryStr.trim().length > 0) {
				console.log(
					`Your query "${queryStr}" consists entirely of common words. Try being more specific.`,
				)
			} else {
				console.log(`No tasks matched "${queryStr}"`)
			}
			return
		}

		const pm = await detectPackageManager(ctx.cwd)
		displayQueryResults(results, queryStr, pm)
	},
})
