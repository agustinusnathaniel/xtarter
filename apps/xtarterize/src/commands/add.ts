import { confirm, groupMultiselect } from '@clack/prompts'
import type { Task, TaskStatus } from '@xtarterize/core'
import {
	abortIfCancelled,
	applyTasks,
	createSpinner,
	detectProject,
	isCI,
	logError,
	logInfo,
	logSuccess,
	runPreflight,
	statusTag,
} from '@xtarterize/core'
import { getAllTasks } from '@xtarterize/tasks'
import { defineCommand } from 'citty'
import { displayDiffs } from '@/ui/diff-display.js'
import { resolveCwd } from '@/utils/cwd.js'
import { handlePreflightFailure } from '@/utils/preflight.js'
import { resolveRuntimeFlags } from '@/utils/runtime-flags.js'
import { printTiming } from '@/utils/timing-display.js'

export const addCommand = defineCommand({
	meta: {
		name: 'add',
		description: 'Add a specific task (or pick interactively)',
	},
	args: {
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
	},
	async run({ args }) {
		const cwd = resolveCwd(args)
		const quiet = args.quiet || isCI()
		const recordTiming = args.timing === true
		const { format } = resolveRuntimeFlags(args)

		const preflight = await runPreflight(cwd)
		if (!preflight.valid) {
			handlePreflightFailure(preflight, false)
		}

		const s = createSpinner(quiet)
		s.start('Scanning project...')

		const detectionStart = performance.now()
		const profile = await detectProject(cwd)
		const detectionMs = performance.now() - detectionStart
		s.stop('Project scanned')

		const allTasks = getAllTasks()

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
	} = options

	const task = allTasks.find((t) => t.id === taskId)

	if (!task) {
		logError(`Task "${taskId}" not found`)
		logInfo('Available tasks:')
		allTasks.forEach((t) => {
			console.log(`  ${t.id}`)
		})
		return
	}

	if (!task.applicable(profile)) {
		logInfo(`Task "${taskId}" is not applicable for this project`)
		return
	}

	const status = await task.check(cwd, profile)
	if (!quiet) console.log(`${statusTag(status)} ${task.id}`)

	if (status === 'skip') {
		logSuccess('Already conformant')
		if (!quiet)
			printTiming({ detectionMs, resolutionMs: 0, resolutionSumMs: 0 })
		return
	}

	const diffs = await task.dryRun(cwd, profile)
	if (!quiet) displayDiffs(diffs, format)

	if (!quiet) {
		const proceed = await confirm({ message: 'Apply this change?' })
		abortIfCancelled(proceed, 'Apply cancelled')
		if (!proceed) return
	}

	const result = await applyTasks({
		tasks: [task],
		cwd,
		profile,
		selectedIds: [task.id],
		quiet,
	})
	if (result.errors.length > 0) {
		logError(`${result.errors.length} errors`)
		for (const error of result.errors) {
			logError(`  - ${error}`)
		}
		if (!quiet)
			printTiming(
				{ detectionMs, resolutionMs: 0, resolutionSumMs: 0 },
				result.timing,
			)
		return
	}
	logSuccess(`${task.id} applied successfully`)
	if (!quiet) {
		printTiming(
			{ detectionMs, resolutionMs: 0, resolutionSumMs: 0 },
			result.timing,
			recordTiming,
		)
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
}) {
	const { allTasks, profile, cwd, quiet, format, detectionMs, recordTiming } =
		options

	const applicable = allTasks.filter((t) => t.applicable(profile))
	if (applicable.length === 0) {
		logInfo('No tasks applicable for this project')
		return
	}

	const s = createSpinner(quiet)
	s.start('Checking task statuses...')

	const tasksWithStatus: TaskWithStatus[] = []
	for (const task of applicable) {
		try {
			const status = await task.check(cwd, profile)
			tasksWithStatus.push({ task, status })
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			logError(`Failed to check ${task.id}: ${message}`)
			tasksWithStatus.push({ task, status: 'conflict' })
		}
	}
	s.stop('Tasks checked')

	if (quiet) {
		logInfo('Interactive mode requires a terminal. Use a task ID instead.')
		return
	}

	const selectedIds = await selectTasksGrouped(tasksWithStatus)
	if (selectedIds.length === 0) {
		logInfo('No tasks selected')
		return
	}

	let totalApplied = 0
	const allErrors: string[] = []
	let totalTiming: import('@xtarterize/core').ApplyTiming | undefined

	for (const taskId of selectedIds) {
		const entry = tasksWithStatus.find((t) => t.task.id === taskId)
		if (!entry) continue

		const diffs = await entry.task.dryRun(cwd, profile)
		displayDiffs(diffs, format)

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
			quiet: true,
		})

		if (result.errors.length > 0) {
			allErrors.push(...result.errors)
			logError(`${entry.task.id}: ${result.errors.join(', ')}`)
		} else {
			totalApplied++
			logSuccess(`${entry.task.id} applied`)
		}

		if (result.timing) {
			totalTiming = result.timing
		}
	}

	console.log('')
	if (allErrors.length > 0) {
		logError(`${allErrors.length} error(s)`)
	}
	logSuccess(`${totalApplied}/${selectedIds.length} tasks applied`)
	if (!quiet && totalTiming) {
		printTiming(
			{ detectionMs, resolutionMs: 0, resolutionSumMs: 0 },
			totalTiming,
			recordTiming,
		)
	}
}

async function selectTasksGrouped(
	tasksWithStatus: TaskWithStatus[],
): Promise<string[]> {
	const groups: Record<string, { value: string; label: string }[]> = {}
	for (const entry of tasksWithStatus) {
		const group = entry.task.group
		if (!groups[group]) groups[group] = []
		const hint = getStatusHint(entry.status)
		groups[group].push({
			value: entry.task.id,
			label: `${entry.task.label} (${entry.task.id})${hint ? ` — ${hint}` : ''}`,
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

function getStatusHint(status: TaskStatus): string {
	switch (status) {
		case 'new':
			return 'new file'
		case 'patch':
			return 'needs update'
		case 'skip':
			return 'up to date'
		case 'conflict':
			return 'conflict'
	}
}
