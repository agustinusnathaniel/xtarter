import { select } from '@clack/prompts'
import type {
	FileDiff,
	ResolveTiming,
	Task,
	TaskStatus,
} from '@xtarterize/core'
import {
	abortIfCancelled,
	applyTasks,
	isCI,
	logError,
	logInfo,
	logSuccess,
	resolveProjectTasks,
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
import { printTiming } from '@/utils/timing-display.js'

interface CommandArgs {
	dryRun?: boolean
	yes?: boolean
	skip?: string
	only?: string
	quiet?: boolean
	includeConflicts?: boolean
	format?: string
	timing?: boolean
}

interface RunCommandOptions {
	actionableStatuses: TaskStatus[]
	emptyMessage: string
	confirmMessage: string
}

async function applyAndReport(
	tasks: Task[],
	cwd: string,
	profile: Awaited<ReturnType<typeof detectProjectWithAmbiguity>>,
	timing: ResolveTiming,
	selectedIds?: string[],
	includeConflicts?: boolean,
	quiet?: boolean,
	recordTiming?: boolean,
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
	if (!quiet) printTiming(timing, result.timing, recordTiming)
}

function resolveActionableTasks(
	tasks: Task[],
	statuses: Map<string, TaskStatus>,
	options: RunCommandOptions,
	args: CommandArgs,
): Task[] {
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
	tasks: Task[],
	cwd: string,
	profile: Awaited<ReturnType<typeof detectProjectWithAmbiguity>>,
	timing: ResolveTiming,
	format: string = 'terminal',
): Promise<void> {
	const diffs: FileDiff[] = []
	for (const task of tasks) {
		const taskDiffs = await task.dryRun(cwd, profile)
		diffs.push(...taskDiffs)
	}
	const resolvedFormat: DisplayFormat = format === 'json' ? 'json' : 'terminal'
	displayDiffs(mergeFileDiffs(diffs), resolvedFormat)
	printTiming(timing)
}

async function promptAndApply(
	actionableTasks: Task[],
	cwd: string,
	profile: Awaited<ReturnType<typeof detectProjectWithAmbiguity>>,
	statuses: Map<string, TaskStatus>,
	timing: ResolveTiming,
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
		await handleDryRun(actionableTasks, cwd, profile, timing, args.format)
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
			timing,
			selected,
			args.includeConflicts,
			args.quiet,
			args.timing,
		)
		return
	}

	const selectedIds = actionableTasks.map((task) => task.id)
	await applyAndReport(
		actionableTasks,
		cwd,
		profile,
		timing,
		selectedIds,
		args.includeConflicts,
		args.quiet,
		args.timing,
	)
}

export async function runCommand(
	cwd: string,
	args: CommandArgs,
	options: RunCommandOptions,
): Promise<void> {
	const ci = isCI()
	const quiet = args.quiet || ci

	const allTasks = getAllTasks()
	const {
		profile: baseProfile,
		tasks,
		statuses,
		timing,
	} = await resolveProjectTasks(cwd, allTasks)
	const profile = await detectProjectWithAmbiguity(cwd, quiet, baseProfile)
	if (!quiet) printProjectProfile(profile)

	const actionableTasks = resolveActionableTasks(tasks, statuses, options, args)

	if (actionableTasks.length === 0) {
		logSuccess(options.emptyMessage)
		if (!quiet) printTiming(timing)
		return
	}

	if (!quiet) displayPlan(actionableTasks, statuses)

	if (args.dryRun) {
		await handleDryRun(actionableTasks, cwd, profile, timing, args.format)
		return
	}

	if (args.yes || quiet) {
		await applyAndReport(
			actionableTasks,
			cwd,
			profile,
			timing,
			undefined,
			undefined,
			quiet,
			args.timing,
		)
		return
	}

	await promptAndApply(
		actionableTasks,
		cwd,
		profile,
		statuses,
		timing,
		args,
		options,
	)
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
	timing: {
		type: 'boolean',
		description: 'Show detailed per-task timing breakdown',
	},
} as const
