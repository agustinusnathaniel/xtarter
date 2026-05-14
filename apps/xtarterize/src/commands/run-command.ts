import { select } from '@clack/prompts'
import type { FileDiff, TaskStatus } from '@xtarterize/core'
import {
	abortIfCancelled,
	applyTasks,
	isCI,
	logError,
	logInfo,
	logSuccess,
	resolveTaskStatuses,
	resolveTasks,
} from '@xtarterize/core'
import { getAllTasks } from '@xtarterize/tasks'
import { type DisplayFormat, displayDiffs } from '@/ui/diff-display.js'
import { mergeFileDiffs } from '@/ui/merge-file-diffs.js'
import { displayPlan } from '@/ui/plan-display.js'
import { selectTasks } from '@/ui/select-menu.js'
import {
	detectProjectWithAmbiguity,
	printProjectProfile,
} from '@/utils/project.js'

interface CommandArgs {
	dryRun?: boolean
	yes?: boolean
	skip?: string
	only?: string
	quiet?: boolean
	includeConflicts?: boolean
	format?: string
}

interface RunCommandOptions {
	actionableStatuses: TaskStatus[]
	emptyMessage: string
	confirmMessage: string
}

async function applyAndReport(
	tasks: ReturnType<typeof resolveTasks>,
	cwd: string,
	profile: Awaited<ReturnType<typeof detectProjectWithAmbiguity>>,
	selectedIds?: string[],
	includeConflicts?: boolean,
	quiet?: boolean,
): Promise<void> {
	const result = await applyTasks(tasks, cwd, profile, selectedIds, {
		includeConflicts,
		quiet: quiet ?? isCI(),
	})
	console.log('')
	logSuccess(`Applied ${result.applied} tasks`)
	if (result.errors.length > 0) {
		logError(`${result.errors.length} errors`)
		for (const error of result.errors) {
			logError(`  - ${error}`)
		}
	}
}

function resolveActionableTasks(
	tasks: ReturnType<typeof resolveTasks>,
	statuses: Map<string, TaskStatus>,
	options: RunCommandOptions,
	args: CommandArgs,
): ReturnType<typeof resolveTasks> {
	let filteredTasks = tasks

	if (args.skip) {
		const skipIds = args.skip.split(',').map((s) => s.trim())
		filteredTasks = filteredTasks.filter((t) => !skipIds.includes(t.id))
	}

	if (args.only) {
		const onlyIds = args.only.split(',').map((s) => s.trim())
		filteredTasks = filteredTasks.filter((t) => onlyIds.includes(t.id))
	}

	return filteredTasks.filter((t) => {
		const status = statuses.get(t.id)
		return status !== undefined && options.actionableStatuses.includes(status)
	})
}

async function handleDryRun(
	tasks: ReturnType<typeof resolveTasks>,
	cwd: string,
	profile: Awaited<ReturnType<typeof detectProjectWithAmbiguity>>,
	format: string = 'terminal',
): Promise<void> {
	const diffs: FileDiff[] = []
	for (const task of tasks) {
		const taskDiffs = await task.dryRun(cwd, profile)
		diffs.push(...taskDiffs)
	}
	const resolvedFormat: DisplayFormat = format === 'json' ? 'json' : 'terminal'
	displayDiffs(mergeFileDiffs(diffs), resolvedFormat)
}

async function promptAndApply(
	actionableTasks: ReturnType<typeof resolveTasks>,
	cwd: string,
	profile: Awaited<ReturnType<typeof detectProjectWithAmbiguity>>,
	statuses: Map<string, TaskStatus>,
	args: CommandArgs,
	options: RunCommandOptions,
): Promise<void> {
	const action = await select({
		message: options.confirmMessage,
		options: [
			{ value: 'apply-all', label: 'Apply all' },
			{ value: 'select', label: 'Select tasks' },
			{ value: 'dry-run', label: 'Dry run' },
			{ value: 'quit', label: 'Quit' },
		],
	})

	abortIfCancelled(action)

	if (action === 'quit') {
		logInfo('Cancelled')
		return
	}

	if (action === 'dry-run') {
		await handleDryRun(actionableTasks, cwd, profile, args.format)
		return
	}

	if (action === 'select') {
		const selected = await selectTasks(actionableTasks, statuses)
		if (selected.length === 0) {
			logInfo('No tasks selected')
			return
		}

		await applyAndReport(
			actionableTasks,
			cwd,
			profile,
			selected,
			args.includeConflicts,
			args.quiet,
		)
		return
	}

	const selectedIds = actionableTasks.map((task) => task.id)
	await applyAndReport(
		actionableTasks,
		cwd,
		profile,
		selectedIds,
		args.includeConflicts,
		args.quiet,
	)
}

export async function runCommand(
	cwd: string,
	args: CommandArgs,
	options: RunCommandOptions,
): Promise<void> {
	const ci = isCI()
	const quiet = args.quiet || ci

	const profile = await detectProjectWithAmbiguity(cwd, quiet)
	if (!quiet) printProjectProfile(profile)

	const allTasks = getAllTasks()
	const tasks = resolveTasks(profile, allTasks)

	const statuses = await resolveTaskStatuses(tasks, cwd, profile)
	const actionableTasks = resolveActionableTasks(tasks, statuses, options, args)

	if (actionableTasks.length === 0) {
		logSuccess(options.emptyMessage)
		return
	}

	if (!quiet) displayPlan(actionableTasks, statuses)

	if (args.dryRun) {
		await handleDryRun(actionableTasks, cwd, profile, args.format)
		return
	}

	if (args.yes || quiet) {
		await applyAndReport(
			actionableTasks,
			cwd,
			profile,
			undefined,
			undefined,
			quiet,
		)
		return
	}

	await promptAndApply(actionableTasks, cwd, profile, statuses, args, options)
}

export const sharedRunArgs = {
	dryRun: {
		type: 'boolean',
		description: 'Preview changes without applying',
	},
	yes: {
		type: 'boolean',
		description: 'Skip all confirmations, apply all',
	},
	skip: {
		type: 'string',
		description: 'Exclude a specific task (comma-separated)',
	},
	only: {
		type: 'string',
		description: 'Apply only a specific task',
	},
	quiet: {
		type: 'boolean',
		description: 'Suppress interactive prompts and verbose output',
	},
	includeConflicts: {
		type: 'boolean',
		description: 'Include conflicting tasks when applying (default: false)',
	},
	format: {
		type: 'string',
		description: 'Output format (terminal|json)',
	},
} as const
