import { confirm } from '@clack/prompts'
import type {
	ApplyTiming,
	ProjectProfile,
	Task,
	TaskStatus,
} from '@xtarterize/core'
import {
	abortIfCancelled,
	applyTasks,
	createSpinner,
	logError,
	logInfo,
	logSuccess,
	logWarn,
	resolveTaskStatuses,
} from '@xtarterize/core'
import { type DisplayFormat, displayDiffs } from '@/ui/diff-display.js'
import { formatRunResult } from '@/ui/json-formatter.js'
import { detectionOnlyTiming, printTiming } from '@/utils/timing-display.js'
import { selectTasksGrouped } from './selection.js'
import type { RunInteractiveOptions, TaskWithStatus } from './types.js'

function handleNoApplicable(options: { jsonMode: boolean }): boolean {
	if (options.jsonMode) {
		console.log(
			formatRunResult({ ok: true, applied: 0, skipped: 0, errors: [] }),
		)
	} else {
		logInfo('No tasks applicable for this project')
	}
	return true
}

function createWrappedTasks(options: {
	tasks: Task[]
	jsonMode: boolean
	checkErrors: string[]
}): Task[] {
	return options.tasks.map((task) => ({
		...task,
		check: async (cwd: string, p: ProjectProfile): Promise<TaskStatus> => {
			try {
				return await task.check(cwd, p)
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error)
				const detail = `Failed to check ${task.id}: ${message}`
				options.checkErrors.push(detail)
				if (!options.jsonMode) logError(detail)
				process.exitCode = 1
				return 'conflict'
			}
		},
	}))
}

function buildTasksWithStatus(options: {
	tasks: Task[]
	statuses: Map<string, TaskStatus>
}): TaskWithStatus[] {
	return options.tasks.map((task) => ({
		task,
		status: options.statuses.get(task.id) ?? 'new',
	}))
}

function handleQuietNoSelection(options: {
	jsonMode: boolean
	checkErrors: string[]
}): boolean {
	const { jsonMode, checkErrors } = options
	if (jsonMode) {
		console.log(
			formatRunResult({
				ok: checkErrors.length === 0,
				applied: 0,
				skipped: 0,
				errors: checkErrors,
			}),
		)
	} else {
		logInfo('Interactive mode requires a terminal. Use a task ID instead.')
	}
	return true
}

async function getSelectedIds(options: {
	allFlag: boolean | undefined
	tasksWithStatus: TaskWithStatus[]
	includeConflicts: boolean
}): Promise<string[]> {
	if (options.allFlag) {
		return options.tasksWithStatus
			.filter(
				(t) =>
					t.status === 'new' ||
					t.status === 'patch' ||
					(options.includeConflicts && t.status === 'conflict'),
			)
			.map((t) => t.task.id)
	}
	return selectTasksGrouped(options.tasksWithStatus)
}

function handleEmptySelection(options: {
	jsonMode: boolean
	checkErrors: string[]
}): boolean {
	if (options.jsonMode) {
		console.log(
			formatRunResult({
				ok: options.checkErrors.length === 0,
				applied: 0,
				skipped: 0,
				errors: options.checkErrors,
			}),
		)
	} else {
		logInfo('No tasks to apply')
	}
	return true
}

async function applyAllTasks(options: {
	selectedTasks: TaskWithStatus[]
	cwd: string
	profile: ProjectProfile
	includeConflicts: boolean
	jsonMode: boolean
	statuses: Map<string, TaskStatus>
}): Promise<{
	applied: number
	errors: string[]
	timing: ApplyTiming | undefined
}> {
	const { selectedTasks, cwd, profile, includeConflicts, jsonMode, statuses } =
		options
	const result = await applyTasks({
		tasks: selectedTasks.map((e) => e.task),
		cwd,
		profile,
		includeConflicts,
		quiet: true,
		statuses,
	})
	if (!jsonMode) {
		for (const error of result.errors) logError(error)
	}
	return {
		applied: result.applied,
		errors: [...result.errors],
		timing: result.timing,
	}
}

async function confirmTaskApply(label: string): Promise<boolean> {
	const proceed = await confirm({ message: `Apply ${label}?` })
	abortIfCancelled(proceed, 'Add cancelled')
	return Boolean(proceed)
}

async function applyOneInteractiveTask(options: {
	entry: TaskWithStatus
	cwd: string
	profile: ProjectProfile
	format: DisplayFormat
	jsonMode: boolean
	includeConflicts: boolean
	statuses: Map<string, TaskStatus>
}): Promise<{
	appliedDelta: number
	errors: string[]
	timing: ApplyTiming | undefined
}> {
	const diffs = await options.entry.task.dryRun(options.cwd, options.profile)
	if (!options.jsonMode) displayDiffs(diffs, options.format)
	const proceed = await confirmTaskApply(options.entry.task.label)
	if (!proceed) return { appliedDelta: 0, errors: [], timing: undefined }
	const result = await applyTasks({
		tasks: [options.entry.task],
		cwd: options.cwd,
		profile: options.profile,
		selectedIds: [options.entry.task.id],
		includeConflicts: options.includeConflicts,
		quiet: true,
		statuses: options.statuses,
	})
	if (result.applied > 0) {
		if (!options.jsonMode) logSuccess(`${options.entry.task.id} applied`)
		return { appliedDelta: 1, errors: [], timing: result.timing }
	}
	if (result.errors.length > 0) {
		if (!options.jsonMode)
			logError(`${options.entry.task.id}: ${result.errors.join(', ')}`)
		return {
			appliedDelta: 0,
			errors: [...result.errors],
			timing: result.timing,
		}
	}
	if (!options.jsonMode)
		logWarn(
			`${options.entry.task.id} skipped (${options.entry.status}) - not applied`,
		)
	return { appliedDelta: 0, errors: [], timing: result.timing }
}

async function applyInteractively(options: {
	selectedTasks: TaskWithStatus[]
	cwd: string
	profile: ProjectProfile
	format: DisplayFormat
	jsonMode: boolean
	includeConflicts: boolean
	statuses: Map<string, TaskStatus>
}): Promise<{
	applied: number
	errors: string[]
	timing: ApplyTiming | undefined
}> {
	let applied = 0
	const errors: string[] = []
	let timing: ApplyTiming | undefined
	for (const entry of options.selectedTasks) {
		const r = await applyOneInteractiveTask({
			entry,
			cwd: options.cwd,
			profile: options.profile,
			format: options.format,
			jsonMode: options.jsonMode,
			includeConflicts: options.includeConflicts,
			statuses: options.statuses,
		})
		applied += r.appliedDelta
		errors.push(...r.errors)
		if (r.timing) timing = r.timing
	}
	return { applied, errors, timing }
}

function maybeWarnConflictsSkipped(options: {
	allFlag: boolean | undefined
	jsonMode: boolean
	includeConflicts: boolean
	tasksWithStatus: TaskWithStatus[]
}): void {
	if (
		options.allFlag &&
		!options.jsonMode &&
		!options.includeConflicts &&
		options.tasksWithStatus.some((t) => t.status === 'conflict')
	) {
		logWarn(
			'Conflicting tasks skipped. Pass --include-conflicts to apply them anyway.',
		)
	}
}

function outputJsonResult(options: {
	allErrors: string[]
	checkErrors: string[]
	applied: number
	selectedCount: number
}): void {
	console.log(
		formatRunResult({
			ok: options.allErrors.length === 0 && options.checkErrors.length === 0,
			applied: options.applied,
			skipped: options.selectedCount - options.applied,
			errors: [...options.checkErrors, ...options.allErrors],
		}),
	)
	if (options.allErrors.length > 0 || options.checkErrors.length > 0) {
		process.exitCode = 1
	}
}

function outputHumanSummary(options: {
	allErrors: string[]
	checkErrors: string[]
	applied: number
	selectedCount: number
	quiet: boolean
	detectionMs: number
	timing: ApplyTiming | undefined
	recordTiming: boolean
}): void {
	console.log('')
	if (options.allErrors.length > 0 || options.checkErrors.length > 0) {
		logError(
			`${options.allErrors.length + options.checkErrors.length} error(s)`,
		)
		process.exitCode = 1
	}
	logSuccess(`${options.applied}/${options.selectedCount} tasks applied`)
	if (!options.quiet && options.timing) {
		printTiming(detectionOnlyTiming(options.detectionMs), options.timing, {
			recordTiming: options.recordTiming,
		})
	}
}

async function resolveStatusesWithSpinner(options: {
	applicable: Task[]
	cwd: string
	profile: ProjectProfile
	quiet: boolean
	jsonMode: boolean
	checkErrors: string[]
}): Promise<{
	statuses: Map<string, TaskStatus>
	tasksWithStatus: TaskWithStatus[]
}> {
	const spinner = createSpinner(options.quiet)
	spinner.start('Checking task statuses...')
	const wrapped = createWrappedTasks({
		tasks: options.applicable,
		jsonMode: options.jsonMode,
		checkErrors: options.checkErrors,
	})
	const statuses = await resolveTaskStatuses(
		wrapped,
		options.cwd,
		options.profile,
	)
	const tasksWithStatus = buildTasksWithStatus({
		tasks: options.applicable,
		statuses,
	})
	spinner.stop('Tasks checked')
	return { statuses, tasksWithStatus }
}

async function executeSelectedTasks(options: {
	selectedTasks: TaskWithStatus[]
	allFlag: boolean | undefined
	cwd: string
	profile: ProjectProfile
	format: DisplayFormat
	jsonMode: boolean
	includeConflicts: boolean
	statuses: Map<string, TaskStatus>
}): Promise<{
	applied: number
	errors: string[]
	timing: ApplyTiming | undefined
}> {
	if (options.allFlag) {
		return applyAllTasks({
			selectedTasks: options.selectedTasks,
			cwd: options.cwd,
			profile: options.profile,
			includeConflicts: options.includeConflicts,
			jsonMode: options.jsonMode,
			statuses: options.statuses,
		})
	}
	return applyInteractively({
		selectedTasks: options.selectedTasks,
		cwd: options.cwd,
		profile: options.profile,
		format: options.format,
		jsonMode: options.jsonMode,
		includeConflicts: options.includeConflicts,
		statuses: options.statuses,
	})
}

async function getValidatedSelection(options: {
	allFlag: boolean | undefined
	tasksWithStatus: TaskWithStatus[]
	includeConflicts: boolean
	jsonMode: boolean
	checkErrors: string[]
}): Promise<TaskWithStatus[] | null> {
	const selectedIds = await getSelectedIds({
		allFlag: options.allFlag,
		tasksWithStatus: options.tasksWithStatus,
		includeConflicts: options.includeConflicts,
	})
	if (selectedIds.length === 0) {
		handleEmptySelection({
			jsonMode: options.jsonMode,
			checkErrors: options.checkErrors,
		})
		return null
	}
	return options.tasksWithStatus.filter((e) => selectedIds.includes(e.task.id))
}

function finalizeInteractiveOutput(options: {
	result: { applied: number; errors: string[]; timing: ApplyTiming | undefined }
	checkErrors: string[]
	selectedCount: number
	jsonMode: boolean
	allFlag: boolean | undefined
	includeConflicts: boolean
	tasksWithStatus: TaskWithStatus[]
	quiet: boolean
	detectionMs: number
	recordTiming: boolean
}): void {
	maybeWarnConflictsSkipped({
		allFlag: options.allFlag,
		jsonMode: options.jsonMode,
		includeConflicts: options.includeConflicts,
		tasksWithStatus: options.tasksWithStatus,
	})
	if (options.jsonMode) {
		outputJsonResult({
			allErrors: options.result.errors,
			checkErrors: options.checkErrors,
			applied: options.result.applied,
			selectedCount: options.selectedCount,
		})
		return
	}
	outputHumanSummary({
		allErrors: options.result.errors,
		checkErrors: options.checkErrors,
		applied: options.result.applied,
		selectedCount: options.selectedCount,
		quiet: options.quiet,
		detectionMs: options.detectionMs,
		timing: options.result.timing,
		recordTiming: options.recordTiming,
	})
}

export async function runInteractive(
	options: RunInteractiveOptions,
): Promise<void> {
	const {
		allTasks,
		profile,
		cwd,
		quiet,
		format,
		detectionMs,
		recordTiming,
		all: allFlag,
		includeConflicts,
	} = options
	const jsonMode = format === 'json'
	const applicable = allTasks.filter((t) => t.applicable(profile))
	if (applicable.length === 0) {
		handleNoApplicable({ jsonMode })
		return
	}
	const checkErrors: string[] = []
	const { statuses, tasksWithStatus } = await resolveStatusesWithSpinner({
		applicable,
		cwd,
		profile,
		quiet,
		jsonMode,
		checkErrors,
	})
	if (quiet && !allFlag) {
		handleQuietNoSelection({ jsonMode, checkErrors })
		return
	}
	const selectedTasks = await getValidatedSelection({
		allFlag,
		tasksWithStatus,
		includeConflicts,
		jsonMode,
		checkErrors,
	})
	if (!selectedTasks) return
	const result = await executeSelectedTasks({
		selectedTasks,
		allFlag,
		cwd,
		profile,
		format,
		jsonMode,
		includeConflicts,
		statuses,
	})
	finalizeInteractiveOutput({
		result,
		checkErrors,
		selectedCount: selectedTasks.length,
		jsonMode,
		allFlag,
		includeConflicts,
		tasksWithStatus,
		quiet,
		detectionMs,
		recordTiming,
	})
}
