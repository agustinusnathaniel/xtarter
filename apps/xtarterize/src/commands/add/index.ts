import { createSpinner, detectProject, logWarn } from '@xtarterize/core'
import { defineCommand } from 'citty'
import { resolveCwdWithPreflight } from '@/utils/preflight.js'
import { getAllTasksWithPlugins } from '@/utils/project.js'
import { resolveRuntimeFlags } from '@/utils/runtime-flags.js'
import { runInteractive } from './interactive.js'
import { runSingleTask } from './single-task.js'

export const addCommand = defineCommand({
	meta: {
		name: 'add',
		description: 'Add a specific task (or pick interactively)',
	},
	args: {
		cwd: {
			type: 'string',
			description: 'Target directory (default: current working directory)',
		},
		taskId: {
			type: 'positional',
			description: 'Task ID (e.g., lint/biome). Omit to pick interactively.',
			required: false,
		},
		quiet: {
			type: 'boolean',
			description: 'Suppress interactive prompts',
		},
		format: {
			type: 'string',
			description: 'Output format (terminal|json)',
		},
		timing: {
			type: 'boolean',
			description: 'Show detailed per-task timing breakdown',
		},
		all: {
			type: 'boolean',
			description:
				'Apply all applicable new and patch tasks without interaction',
		},
		includeConflicts: {
			type: 'boolean',
			description: 'Include conflicting tasks when applying (default: false)',
		},
	},
	async run({ args }) {
		await handleAddCommand(args)
	},
})

interface AddCommandArgs {
	cwd?: string
	taskId?: string
	quiet?: boolean
	format?: string
	timing?: boolean
	all?: boolean
	includeConflicts?: boolean
}

async function handleAddCommand(args: AddCommandArgs): Promise<void> {
	const cwd = await resolveCwdWithPreflight(args as { cwd?: string })
	const { format, quiet: runtimeQuiet } = resolveRuntimeFlags(args)
	const jsonMode = format === 'json'
	const quiet = jsonMode || Boolean(runtimeQuiet)
	const recordTiming = args.timing === true

	const spinner = createSpinner(quiet)
	spinner.start('Scanning project...')
	const detectionStart = performance.now()
	const profile = await detectProject(cwd)
	const detectionMs = performance.now() - detectionStart
	spinner.stop('Project scanned')

	const allTasks = await getAllTasksWithPlugins(cwd)

	if (args.all && args.taskId) {
		logWarn(
			'Both --all and a task ID were specified. The task ID will be ignored.',
		)
	}

	if (args.all) {
		await runInteractive({
			allTasks,
			profile,
			cwd,
			quiet,
			format,
			detectionMs,
			recordTiming,
			all: true,
			includeConflicts: args.includeConflicts === true,
		})
		return
	}

	if (args.taskId) {
		await runSingleTask({
			taskId: args.taskId,
			allTasks,
			profile,
			cwd,
			quiet,
			format,
			detectionMs,
			recordTiming,
			includeConflicts: args.includeConflicts === true,
		})
		return
	}

	await runInteractive({
		allTasks,
		profile,
		cwd,
		quiet,
		format,
		detectionMs,
		recordTiming,
		includeConflicts: args.includeConflicts === true,
	})
}
