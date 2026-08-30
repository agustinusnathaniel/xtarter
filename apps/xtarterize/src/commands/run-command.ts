import { select } from '@clack/prompts'
import type { ResolveTiming, Task, TaskStatus } from '@xtarterize/core'
import {
	abortIfCancelled,
	applyTaskSelection,
	applyTasks,
	isCI,
	loadSelectionConfig,
	logError,
	logInfo,
	logSuccess,
	logWarn,
	resolveProjectTasks,
} from '@xtarterize/core'
import { type DisplayFormat, displayDiffs } from '@/ui/diff-display.js'
import { formatRunResult } from '@/ui/json-formatter.js'
import { mergeFileDiffs } from '@/ui/merge-file-diffs.js'
import { displayPlan } from '@/ui/plan-display.js'
import { selectTasks } from '@/ui/select-menu.js'
import {
	detectProjectWithAmbiguity,
	getAllTasksWithPlugins,
	printProjectProfile,
} from '@/utils/project.js'
import { resolveRuntimeFlags } from '@/utils/runtime-flags.js'
import { collectTaskDiffs } from '@/utils/task-diffs.js'
import { formatTimingJson, printTiming } from '@/utils/timing-display.js'

interface CommandArgs {
	dryRun?: boolean
	yes?: boolean
	skip?: string
	only?: string
	quiet?: boolean
	includeConflicts?: boolean
	format?: string
	timing?: boolean
	json?: boolean
}

interface RunCommandOptions {
	actionableStatuses: TaskStatus[]
	emptyMessage: string
	confirmMessage: string
	orderedTasks?: Task[]
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
	format?: string
	options: ApplyAndReportOptions
	statuses?: ReadonlyMap<string, TaskStatus>
}

async function applyAndReport({
	tasks,
	cwd,
	profile,
	timing,
	format,
	options,
	statuses,
}: ApplyAndReportInput): Promise<void> {
	const { selectedIds, includeConflicts, quiet, recordTiming } = options
	const result = await applyTasks({
		tasks,
		cwd,
		profile,
		selectedIds,
		includeConflicts,
		quiet: quiet ?? isCI(),
		statuses,
	})

	if (format === 'json') {
		console.log(
			formatRunResult({
				ok: result.errors.length === 0,
				applied: result.applied,
				skipped: result.skipped,
				errors: result.errors,
				timing: recordTiming
					? formatTimingJson(timing, result.timing)
					: undefined,
			}),
		)
		if (result.errors.length > 0) {
			process.exitCode = 1
		}
		return
	}

	console.log('')
	logSuccess(`Applied ${result.applied} tasks`)
	if (result.errors.length > 0) {
		logError(`${result.errors.length} errors`)
		for (const error of result.errors) {
			logError(`  - ${error}`)
		}
		process.exitCode = 1
	}
	const quietFlag = quiet ?? isCI()
	if (!quietFlag) printTiming(timing, result.timing, { recordTiming })
}

interface ResolveActionableTasksOptions {
	actionableStatuses: TaskStatus[]
	skip?: string
	only?: string
	/** Persisted selection: task IDs always excluded */
	configSkip?: string[]
	/** Persisted selection: when non-empty, restrict runs to these IDs */
	configOnly?: string[]
}

function resolveActionableTasks(
	tasks: Task[],
	statuses: Map<string, TaskStatus>,
	options: ResolveActionableTasksOptions,
): Task[] {
	const selected = applyTaskSelection(tasks, {
		cliSkip: options.skip,
		cliOnly: options.only,
		configSkip: options.configSkip,
		configOnly: options.configOnly,
	})

	return selected.filter((t) => {
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
	const { diffs, failures } = await collectTaskDiffs(tasks, cwd, profile)
	const mergedDiffs = mergeFileDiffs(diffs)
	if (mergedDiffs.length > 0 || failures > 0) {
		process.exitCode = 1
	}
	const resolvedFormat: DisplayFormat = format === 'json' ? 'json' : 'terminal'
	displayDiffs(mergedDiffs, resolvedFormat, failures)
	if (format !== 'json') printTiming(timing)
}

interface PromptAndApplyOptions {
	actionableTasks: Task[]
	cwd: string
	profile: Awaited<ReturnType<typeof detectProjectWithAmbiguity>>
	statuses: Map<string, TaskStatus>
	timing: ResolveTiming
	args: CommandArgs
	runOptions: RunCommandOptions
	format?: string
}

async function handleSelectTasksFlow(
	options: PromptAndApplyOptions,
): Promise<boolean> {
	const { actionableTasks, cwd, profile, statuses, timing, args, format } =
		options
	const selected = await selectTasks(actionableTasks, statuses)
	if (selected.length === 0) {
		logInfo('No tasks selected')
		return true
	}
	await applyAndReport({
		tasks: actionableTasks,
		cwd,
		profile,
		timing,
		format,
		statuses,
		options: {
			selectedIds: selected,
			includeConflicts: args.includeConflicts,
			quiet: args.quiet,
			recordTiming: args.timing,
		},
	})
	return true
}

async function handleApplyAllFlow(
	options: PromptAndApplyOptions,
): Promise<void> {
	const { actionableTasks, cwd, profile, statuses, timing, args, format } =
		options
	const selectedIds = actionableTasks.map((task) => task.id)
	await applyAndReport({
		tasks: actionableTasks,
		cwd,
		profile,
		timing,
		format,
		statuses,
		options: {
			selectedIds,
			includeConflicts: args.includeConflicts,
			quiet: args.quiet,
			recordTiming: args.timing,
		},
	})
}

async function promptAndApply(options: PromptAndApplyOptions): Promise<void> {
	const { actionableTasks, cwd, profile, timing, runOptions, format } = options
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
		await handleDryRun({ tasks: actionableTasks, cwd, profile, timing, format })
		return
	}
	if (action === 'select') {
		await handleSelectTasksFlow(options)
		return
	}
	await handleApplyAllFlow(options)
}

async function loadProjectContext(
	cwd: string,
	quiet: boolean,
	orderedTasks: Task[] | undefined,
) {
	const allTasks = orderedTasks ?? (await getAllTasksWithPlugins(cwd))
	const {
		profile: baseProfile,
		tasks,
		statuses,
		timing,
	} = await resolveProjectTasks(cwd, allTasks)
	const profile = await detectProjectWithAmbiguity(cwd, quiet, baseProfile)
	if (!quiet) printProjectProfile(profile)
	const selection = await loadSelectionConfig(cwd)
	return { profile, tasks, statuses, timing, selection }
}

function warnUnknownSelection(
	selection: { skip: string[]; only: string[] },
	tasks: Task[],
	quiet: boolean,
) {
	if (quiet || selection.skip.length + selection.only.length === 0) return
	const unknown = [...selection.skip, ...selection.only].filter(
		(id) => !tasks.some((t) => t.id === id),
	)
	if (unknown.length > 0)
		logWarn(
			`Selection config references unknown task IDs: ${unknown.join(', ')}`,
		)
}

function handleEmptyActionable(options: {
	actionableTasks: Task[]
	jsonMode: boolean
	quiet: boolean
	timing: ResolveTiming
	emptyMessage: string
}): boolean {
	const { actionableTasks, jsonMode, quiet, timing, emptyMessage } = options
	if (actionableTasks.length > 0) return false
	if (jsonMode)
		console.log(
			formatRunResult({ ok: true, applied: 0, skipped: 0, errors: [] }),
		)
	else {
		logSuccess(emptyMessage)
		if (!quiet) printTiming(timing)
	}
	return true
}

export async function runCommand(
	cwd: string,
	args: CommandArgs,
	options: RunCommandOptions,
): Promise<void> {
	const { format, quiet: runtimeQuiet } = resolveRuntimeFlags(args)
	const jsonMode = format === 'json'
	const quiet = jsonMode || runtimeQuiet
	const { profile, tasks, statuses, timing, selection } =
		await loadProjectContext(cwd, quiet, options.orderedTasks)
	warnUnknownSelection(selection, tasks, quiet)
	const actionableTasks = resolveActionableTasks(tasks, statuses, {
		actionableStatuses: options.actionableStatuses,
		skip: args.skip,
		only: args.only,
		configSkip: selection.skip,
		configOnly: selection.only,
	})
	if (
		handleEmptyActionable({
			actionableTasks,
			jsonMode,
			quiet,
			timing,
			emptyMessage: options.emptyMessage,
		})
	)
		return
	if (!quiet) displayPlan(actionableTasks, statuses)
	if (args.dryRun) {
		await handleDryRun({ tasks: actionableTasks, cwd, profile, timing, format })
		return
	}
	if (args.yes || quiet) {
		await applyAndReport({
			tasks: actionableTasks,
			cwd,
			profile,
			timing,
			format,
			statuses,
			options: {
				quiet,
				recordTiming: args.timing,
				includeConflicts: args.includeConflicts,
			},
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
		format,
	})
}

export const sharedRunArgs = {
	cwd: {
		type: 'string',
		description: 'Target directory (default: current working directory)',
	},
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
