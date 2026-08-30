import { confirm } from '@clack/prompts'
import type { ProjectProfile, Task, TaskStatus } from '@xtarterize/core'
import {
	abortIfCancelled,
	applyTasks,
	logError,
	logInfo,
	logSuccess,
	logWarn,
	statusTag,
} from '@xtarterize/core'
import { type DisplayFormat, displayDiffs } from '@/ui/diff-display.js'
import { formatRunResult } from '@/ui/json-formatter.js'
import { detectionOnlyTiming, printTiming } from '@/utils/timing-display.js'
import type { RunSingleTaskOptions } from './types.js'

function findTask(allTasks: Task[], taskId: string): Task | undefined {
	return allTasks.find((t) => t.id === taskId)
}

function handleMissingTask(options: {
	taskId: string
	allTasks: Task[]
	jsonMode: boolean
}): void {
	const { taskId, allTasks, jsonMode } = options
	if (jsonMode) {
		console.log(
			formatRunResult({
				ok: false,
				taskId,
				applied: 0,
				skipped: 0,
				errors: [`Task "${taskId}" not found`],
			}),
		)
	} else {
		logError(`Task "${taskId}" not found`)
		logInfo('Available tasks:')
		for (const t of allTasks) {
			console.log(`  ${t.id}`)
		}
	}
	process.exitCode = 1
}

function handleNotApplicable(options: {
	taskId: string
	jsonMode: boolean
}): void {
	const { taskId, jsonMode } = options
	if (jsonMode) {
		console.log(
			formatRunResult({
				ok: true,
				taskId,
				status: 'not-applicable',
				applied: 0,
				skipped: 0,
				errors: [],
			}),
		)
	} else {
		logInfo(`Task "${taskId}" is not applicable for this project`)
	}
}

async function getTaskStatus(options: {
	task: Task
	cwd: string
	profile: ProjectProfile
	jsonMode: boolean
}): Promise<TaskStatus | null> {
	const { task, cwd, profile, jsonMode } = options
	try {
		return await task.check(cwd, profile)
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		if (jsonMode) {
			console.log(
				formatRunResult({
					ok: false,
					taskId: task.id,
					applied: 0,
					skipped: 0,
					errors: [`Failed to check ${task.id}: ${message}`],
				}),
			)
		} else {
			logError(`Failed to check ${task.id}: ${message}`)
		}
		process.exitCode = 1
		return null
	}
}

function handleSkipStatus(options: {
	taskId: string
	status: TaskStatus
	jsonMode: boolean
	quiet: boolean
	detectionMs: number
}): boolean {
	const { taskId, status, jsonMode, quiet, detectionMs } = options
	if (status !== 'skip') {
		return false
	}
	if (jsonMode) {
		console.log(
			formatRunResult({
				ok: true,
				taskId,
				status: 'skip',
				applied: 0,
				skipped: 0,
				errors: [],
			}),
		)
	} else {
		logSuccess('Already conformant')
		if (!quiet) {
			printTiming(detectionOnlyTiming(detectionMs))
		}
	}
	return true
}

function handleConflictStatus(options: {
	taskId: string
	status: TaskStatus
	jsonMode: boolean
	includeConflicts: boolean
}): boolean {
	const { taskId, status, jsonMode, includeConflicts } = options
	if (status !== 'conflict' || includeConflicts) {
		return false
	}
	if (jsonMode) {
		console.log(
			formatRunResult({
				ok: false,
				taskId,
				status: 'conflict',
				applied: 0,
				skipped: 0,
				errors: [
					`Task "${taskId}" conflicts with existing configuration and was not applied`,
				],
			}),
		)
	} else {
		logWarn(
			`Task "${taskId}" conflicts with existing configuration and was not applied`,
		)
		logInfo('Resolve the conflict manually, then re-run to apply.')
	}
	process.exitCode = 1
	return true
}

async function confirmSingleApply(options: {
	quiet: boolean
	jsonMode: boolean
}): Promise<boolean> {
	const { quiet, jsonMode } = options
	if (quiet || jsonMode) {
		return true
	}
	const proceed = await confirm({ message: 'Apply this change?' })
	abortIfCancelled(proceed, 'Apply cancelled')
	return Boolean(proceed)
}

async function applySingleTask(options: {
	task: Task
	status: TaskStatus
	cwd: string
	profile: ProjectProfile
	quiet: boolean
	format: DisplayFormat
	jsonMode: boolean
	detectionMs: number
	recordTiming: boolean
	includeConflicts: boolean
}): Promise<void> {
	const {
		task,
		status,
		cwd,
		profile,
		quiet,
		format,
		jsonMode,
		detectionMs,
		recordTiming,
		includeConflicts,
	} = options

	const result = await applyTasks({
		tasks: [task],
		cwd,
		profile,
		selectedIds: [task.id],
		includeConflicts,
		quiet,
		statuses: new Map([[task.id, status]]),
	})

	if (result.errors.length > 0) {
		if (jsonMode) {
			console.log(
				formatRunResult({
					ok: false,
					taskId: task.id,
					applied: 0,
					skipped: 0,
					errors: result.errors,
				}),
			)
		} else {
			logError(`${result.errors.length} errors`)
			for (const error of result.errors) {
				logError(`  - ${error}`)
			}
			if (!quiet) {
				printTiming(detectionOnlyTiming(detectionMs), result.timing)
			}
		}
		process.exitCode = 1
		return
	}

	if (jsonMode) {
		console.log(
			formatRunResult({
				ok: true,
				taskId: task.id,
				status,
				applied: 1,
				skipped: 0,
				errors: [],
			}),
		)
		return
	}

	logSuccess(`${task.id} applied successfully`)
	if (!quiet) {
		printTiming(detectionOnlyTiming(detectionMs), result.timing, {
			recordTiming,
		})
	}

	// Prevent unused variable warning for extracted `format`
	void format
}

export async function runSingleTask(
	options: RunSingleTaskOptions,
): Promise<void> {
	const {
		taskId,
		allTasks,
		profile,
		cwd,
		quiet,
		format,
		detectionMs,
		recordTiming,
		includeConflicts,
	} = options
	const jsonMode = format === 'json'

	const task = findTask(allTasks, taskId)
	if (!task) {
		handleMissingTask({ taskId, allTasks, jsonMode })
		return
	}

	if (!task.applicable(profile)) {
		handleNotApplicable({ taskId, jsonMode })
		return
	}

	const status = await getTaskStatus({ task, cwd, profile, jsonMode })
	if (status === null) {
		return
	}

	if (!quiet) {
		console.log(`${statusTag(status)} ${task.id}`)
	}

	if (handleSkipStatus({ taskId, status, jsonMode, quiet, detectionMs })) {
		return
	}
	if (handleConflictStatus({ taskId, status, jsonMode, includeConflicts })) {
		return
	}

	const diffs = await task.dryRun(cwd, profile)
	if (!quiet && !jsonMode) {
		displayDiffs(diffs, format)
	}

	const proceed = await confirmSingleApply({ quiet, jsonMode })
	if (!proceed) {
		return
	}

	await applySingleTask({
		task,
		status,
		cwd,
		profile,
		quiet,
		format,
		jsonMode,
		detectionMs,
		recordTiming,
		includeConflicts,
	})
}
