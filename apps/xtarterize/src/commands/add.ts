import { confirm, groupMultiselect } from '@clack/prompts'
import type { Task, TaskStatus } from '@xtarterize/core'
import {
	abortIfCancelled,
	applyTasks,
	createSpinner,
	detectProject,
	logError,
	logInfo,
	logSuccess,
	logWarn,
	statusTag,
} from '@xtarterize/core'
import { defineCommand } from 'citty'
import { displayDiffs } from '@/ui/diff-display.js'
import { formatRunResult } from '@/ui/json-formatter.js'
import { statusHint } from '@/utils/display.js'
import { resolveCwdWithPreflight } from '@/utils/preflight.js'
import { getAllTasksWithPlugins } from '@/utils/project.js'
import { resolveRuntimeFlags } from '@/utils/runtime-flags.js'
import { detectionOnlyTiming, printTiming } from '@/utils/timing-display.js'

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
		const cwd = await resolveCwdWithPreflight(args)
		const { format, quiet: runtimeQuiet } = resolveRuntimeFlags(args)
		// JSON mode implies quiet: stdout must carry only the JSON document,
		// so the human logs/spinner are suppressed even when the user passes
		// `--format json` without `--quiet`/`--json`.
		const jsonMode = format === 'json'
		const quiet = jsonMode || runtimeQuiet
		const recordTiming = args.timing === true

		const s = createSpinner(quiet)
		s.start('Scanning project...')

		const detectionStart = performance.now()
		const profile = await detectProject(cwd)
		const detectionMs = performance.now() - detectionStart
		s.stop('Project scanned')

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
		} else if (args.taskId) {
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
		} else {
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
	},
})

async function runSingleTask(options: {
	taskId: string
	allTasks: Task[]
	profile: import('@xtarterize/core').ProjectProfile
	cwd: string
	quiet: boolean
	format: import('@/ui/diff-display.js').DisplayFormat
	detectionMs: number
	recordTiming: boolean
	includeConflicts: boolean
}) {
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

	const task = allTasks.find((t) => t.id === taskId)
	const jsonMode = format === 'json'

	if (!task) {
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
			allTasks.forEach((t) => {
				console.log(`  ${t.id}`)
			})
		}
		process.exitCode = 1
		return
	}

	if (!task.applicable(profile)) {
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
		return
	}

	let status: TaskStatus
	try {
		status = await task.check(cwd, profile)
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		if (jsonMode) {
			console.log(
				formatRunResult({
					ok: false,
					taskId,
					applied: 0,
					skipped: 0,
					errors: [`Failed to check ${task.id}: ${message}`],
				}),
			)
		} else {
			logError(`Failed to check ${task.id}: ${message}`)
		}
		process.exitCode = 1
		return
	}
	if (!quiet) console.log(`${statusTag(status)} ${task.id}`)

	if (status === 'skip') {
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
			if (!quiet) printTiming(detectionOnlyTiming(detectionMs))
		}
		return
	}

	if (status === 'conflict' && !includeConflicts) {
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
		return
	}

	const diffs = await task.dryRun(cwd, profile)
	if (!quiet && !jsonMode) displayDiffs(diffs, format)

	if (!quiet && !jsonMode) {
		const proceed = await confirm({ message: 'Apply this change?' })
		abortIfCancelled(proceed, 'Apply cancelled')
		if (!proceed) return
	}

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
					taskId,
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
			if (!quiet) printTiming(detectionOnlyTiming(detectionMs), result.timing)
		}
		process.exitCode = 1
		return
	}
	if (jsonMode) {
		console.log(
			formatRunResult({
				ok: true,
				taskId,
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
}

interface TaskWithStatus {
	task: Task
	status: TaskStatus
}

async function runInteractive(options: {
	allTasks: Task[]
	profile: import('@xtarterize/core').ProjectProfile
	cwd: string
	quiet: boolean
	format: import('@/ui/diff-display.js').DisplayFormat
	detectionMs: number
	recordTiming: boolean
	all?: boolean
	includeConflicts: boolean
}) {
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
		if (jsonMode) {
			console.log(
				formatRunResult({ ok: true, applied: 0, skipped: 0, errors: [] }),
			)
		} else {
			logInfo('No tasks applicable for this project')
		}
		return
	}

	const s = createSpinner(quiet)
	s.start('Checking task statuses...')

	const tasksWithStatus: TaskWithStatus[] = []
	const checkErrors: string[] = []
	for (const task of applicable) {
		try {
			const status = await task.check(cwd, profile)
			tasksWithStatus.push({ task, status })
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			const detail = `Failed to check ${task.id}: ${message}`
			checkErrors.push(detail)
			if (!jsonMode) logError(detail)
			process.exitCode = 1
			tasksWithStatus.push({ task, status: 'conflict' })
		}
	}
	s.stop('Tasks checked')

	const statusesMap = new Map(tasksWithStatus.map((t) => [t.task.id, t.status]))

	if (quiet && !allFlag) {
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
		return
	}

	const selectedIds = allFlag
		? tasksWithStatus
				.filter(
					(t) =>
						t.status === 'new' ||
						t.status === 'patch' ||
						(includeConflicts && t.status === 'conflict'),
				)
				.map((t) => t.task.id)
		: await selectTasksGrouped(tasksWithStatus)
	if (selectedIds.length === 0) {
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
			logInfo('No tasks to apply')
		}
		return
	}

	const selectedTasks = tasksWithStatus.filter((entry) =>
		selectedIds.includes(entry.task.id),
	)

	let totalApplied = 0
	const allErrors: string[] = []
	let totalTiming: import('@xtarterize/core').ApplyTiming | undefined

	if (allFlag) {
		const result = await applyTasks({
			tasks: selectedTasks.map((entry) => entry.task),
			cwd,
			profile,
			includeConflicts,
			quiet: true,
			statuses: statusesMap,
		})
		totalApplied = result.applied
		allErrors.push(...result.errors)
		totalTiming = result.timing
		if (!jsonMode) {
			for (const error of result.errors) {
				logError(error)
			}
		}
	} else {
		for (const entry of selectedTasks) {
			const diffs = await entry.task.dryRun(cwd, profile)
			if (!jsonMode) displayDiffs(diffs, format)

			const proceed = await confirm({
				message: `Apply ${entry.task.label}?`,
			})
			abortIfCancelled(proceed, 'Add cancelled')
			if (!proceed) continue

			const result = await applyTasks({
				tasks: [entry.task],
				cwd,
				profile,
				selectedIds: [entry.task.id],
				includeConflicts,
				quiet: true,
				statuses: statusesMap,
			})

			if (result.applied > 0) {
				totalApplied++
				if (!jsonMode) logSuccess(`${entry.task.id} applied`)
			} else if (result.errors.length > 0) {
				allErrors.push(...result.errors)
				if (!jsonMode) logError(`${entry.task.id}: ${result.errors.join(', ')}`)
			} else if (!jsonMode) {
				logWarn(`${entry.task.id} skipped (${entry.status}) - not applied`)
			}

			if (result.timing) {
				totalTiming = result.timing
			}
		}
	}

	if (
		allFlag &&
		!jsonMode &&
		!includeConflicts &&
		tasksWithStatus.some((t) => t.status === 'conflict')
	) {
		logWarn(
			'Conflicting tasks skipped. Pass --include-conflicts to apply them anyway.',
		)
	}

	if (jsonMode) {
		console.log(
			formatRunResult({
				ok: allErrors.length === 0 && checkErrors.length === 0,
				applied: totalApplied,
				skipped: selectedTasks.length - totalApplied,
				errors: [...checkErrors, ...allErrors],
			}),
		)
		if (allErrors.length > 0 || checkErrors.length > 0) {
			process.exitCode = 1
		}
		return
	}

	console.log('')
	if (allErrors.length > 0 || checkErrors.length > 0) {
		logError(`${allErrors.length + checkErrors.length} error(s)`)
		process.exitCode = 1
	}
	logSuccess(`${totalApplied}/${selectedTasks.length} tasks applied`)
	if (!quiet && totalTiming) {
		printTiming(detectionOnlyTiming(detectionMs), totalTiming, {
			recordTiming,
		})
	}
}

async function selectTasksGrouped(
	tasksWithStatus: TaskWithStatus[],
): Promise<string[]> {
	const groups: Record<string, { value: string; label: string }[]> = {}
	for (const entry of tasksWithStatus) {
		const group = entry.task.group
		if (!groups[group]) groups[group] = []
		const hint = statusHint(entry.status)
		groups[group].push({
			value: entry.task.id,
			label: `${entry.task.label} (${entry.task.id})${hint ? ` - ${hint}` : ''}`,
		})
	}

	const defaultSelected = tasksWithStatus
		.filter((t) => t.status === 'new' || t.status === 'patch')
		.map((t) => t.task.id)

	const selected = await groupMultiselect({
		message: 'Select tasks to add:',
		options: groups,
		initialValues: defaultSelected,
		required: true,
	})

	if (Array.isArray(selected)) {
		return selected as string[]
	}

	return []
}
