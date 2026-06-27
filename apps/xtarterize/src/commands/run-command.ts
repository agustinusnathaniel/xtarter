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
import { type DisplayFormat, displayDiffs } from '@/ui/diff-display.js'
import { mergeFileDiffs } from '@/ui/merge-file-diffs.js'
import { displayPlan } from '@/ui/plan-display.js'
import { selectTasks } from '@/ui/select-menu.js'
import {
	detectProjectWithAmbiguity,
	getAllTasksWithPlugins,
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

interface ApplyAndReportOptions {
	selectedIds?: string[]
	includeConflicts?: boolean
	quiet?: boolean
	recordTiming?: boolean
}

interface ApplyAndReportInput {
	tasks: Task[]
	cwd: string
	profile: Awaited<ReturnType<typeof detectProjectWithAmbiguity>>
	timing: ResolveTiming
	options: ApplyAndReportOptions
}

async function applyAndReport({
	tasks,
	cwd,
	profile,
	timing,
	options,
}: ApplyAndReportInput): Promise<void> {
	const { selectedIds, includeConflicts, quiet, recordTiming } = options
	const result = await applyTasks({
		tasks,
		cwd,
		profile,
		selectedIds,
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
	const quietFlag = quiet ?? isCI()
	if (!quietFlag) printTiming(timing, result.timing, recordTiming)
}

interface ResolveActionableTasksOptions {
	actionableStatuses: TaskStatus[]
	skip?: string
	only?: string
}

function resolveActionableTasks(
	tasks: Task[],
	statuses: Map<string, TaskStatus>,
	options: ResolveActionableTasksOptions,
): Task[] {
	let filteredTasks = tasks

	if (options.skip) {
		const skipIds = options.skip
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean)
		filteredTasks = filteredTasks.filter((t) => !skipIds.includes(t.id))
	}

	if (options.only) {
		const onlyIds = options.only
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean)
		if (onlyIds.length > 0) {
			filteredTasks = filteredTasks.filter((t) => onlyIds.includes(t.id))
		}
	}

	return filteredTasks.filter((t) => {
		const status = statuses.get(t.id)
		return status !== undefined && options.actionableStatuses.includes(status)
	})
}

interface DryRunOptions {
	tasks: Task[]
	cwd: string
	profile: Awaited<ReturnType<typeof detectProjectWithAmbiguity>>
	timing: ResolveTiming
	format?: string
}

async function handleDryRun(options: DryRunOptions): Promise<void> {
	const { tasks, cwd, profile, timing, format } = options
	const diffs: FileDiff[] = []
	for (const task of tasks) {
		try {
			const taskDiffs = await task.dryRun(cwd, profile)
			diffs.push(...taskDiffs)
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			logError(`Failed to dryRun ${task.id}: ${message}`)
		}
	}
	const resolvedFormat: DisplayFormat = format === 'json' ? 'json' : 'terminal'
	displayDiffs(mergeFileDiffs(diffs), resolvedFormat)
	printTiming(timing)
}

interface PromptAndApplyOptions {
	actionableTasks: Task[]
	cwd: string
	profile: Awaited<ReturnType<typeof detectProjectWithAmbiguity>>
	statuses: Map<string, TaskStatus>
	timing: ResolveTiming
	args: CommandArgs
	runOptions: RunCommandOptions
}

async function promptAndApply(options: PromptAndApplyOptions): Promise<void> {
	const { actionableTasks, cwd, profile, statuses, timing, args, runOptions } =
		options
	const action = await select({
		message: runOptions.confirmMessage,
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
		await handleDryRun({
			tasks: actionableTasks,
			cwd,
			profile,
			timing,
			format: args.format,
		})
		return
	}

	if (action === 'select') {
		const selected = await selectTasks(actionableTasks, statuses)
		if (selected.length === 0) {
			logInfo('No tasks selected')
			return
		}

		await applyAndReport({
			tasks: actionableTasks,
			cwd,
			profile,
			timing,
			options: {
				selectedIds: selected,
				includeConflicts: args.includeConflicts,
				quiet: args.quiet,
				recordTiming: args.timing,
			},
		})
		return
	}

	const selectedIds = actionableTasks.map((task) => task.id)
	await applyAndReport({
		tasks: actionableTasks,
		cwd,
		profile,
		timing,
		options: {
			selectedIds,
			includeConflicts: args.includeConflicts,
			quiet: args.quiet,
			recordTiming: args.timing,
		},
	})
}

export async function runCommand(
	cwd: string,
	args: CommandArgs,
	options: RunCommandOptions,
): Promise<void> {
	const ci = isCI()
	const quiet = args.quiet || ci

	const allTasks = await getAllTasksWithPlugins(cwd)
	const {
		profile: baseProfile,
		tasks,
		statuses,
		timing,
	} = await resolveProjectTasks(cwd, allTasks)
	const profile = await detectProjectWithAmbiguity(cwd, quiet, baseProfile)
	if (!quiet) printProjectProfile(profile)

	const actionableTasks = resolveActionableTasks(tasks, statuses, {
		actionableStatuses: options.actionableStatuses,
		skip: args.skip,
		only: args.only,
	})

	if (actionableTasks.length === 0) {
		logSuccess(options.emptyMessage)
		if (!quiet) printTiming(timing)
		return
	}

	if (!quiet) displayPlan(actionableTasks, statuses)

	if (args.dryRun) {
		await handleDryRun({
			tasks: actionableTasks,
			cwd,
			profile,
			timing,
			format: args.format,
		})
		return
	}

	if (args.yes || quiet) {
		await applyAndReport({
			tasks: actionableTasks,
			cwd,
			profile,
			timing,
			options: { quiet, recordTiming: args.timing },
		})
		return
	}

	await promptAndApply({
		actionableTasks,
		cwd,
		profile,
		statuses,
		timing,
		args,
		runOptions: options,
	})
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
