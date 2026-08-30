import { spinner } from '@clack/prompts'
import type { Task, TaskStatus } from '@/_base.js'
import {
	classifyCheckResults,
	collectCheckResults,
} from '@/apply/check-phase.js'
import {
	collectDryRunOutcomes,
	processDryRunOutcomes,
} from '@/apply/dryrun-phase.js'
import {
	backupAndManifest,
	collectAndInstallDeps,
	executeApplyTasks,
} from '@/apply/execute-phase.js'
import type { ProjectProfile } from '@/detect.js'
import type { ApplyTiming } from '@/timing.js'

export interface ApplyOptions {
	includeConflicts?: boolean
	quiet?: boolean
	selectedIds?: string[]
}

export interface ApplyResult {
	applied: number
	skipped: number
	errors: string[]
	timing?: ApplyTiming
}

export interface ApplyTasksOptions {
	tasks: Task[]
	cwd: string
	profile: ProjectProfile
	selectedIds?: string[]
	includeConflicts?: boolean
	quiet?: boolean
	statuses?: ReadonlyMap<string, TaskStatus>
}

export function applyTasks(options: ApplyTasksOptions): Promise<ApplyResult> {
	const selectedIds = options.selectedIds
	const toApply = selectedIds
		? options.tasks.filter((t) => selectedIds.includes(t.id))
		: options.tasks
	const includeConflicts = options.includeConflicts ?? false
	const quiet = options.quiet ?? false
	return runApply({
		tasks: toApply,
		cwd: options.cwd,
		profile: options.profile,
		includeConflicts,
		quiet,
		statuses: options.statuses,
	})
}

interface RunApplyOptions {
	tasks: Task[]
	cwd: string
	profile: ProjectProfile
	includeConflicts: boolean
	quiet: boolean
	statuses?: ReadonlyMap<string, TaskStatus>
}

async function runApply(options: RunApplyOptions): Promise<ApplyResult> {
	const { tasks, cwd, profile, includeConflicts, quiet, statuses } = options
	const applyStart = performance.now()
	const perTask: ApplyTiming['tasks'] = []
	const s = quiet ? null : spinner()

	const checkResults = await collectCheckResults({
		tasks,
		cwd,
		profile,
		statuses,
	})
	const { toDryRun, skippedInCheck } = classifyCheckResults({
		checkResults,
		includeConflicts,
		quiet,
		perTask,
	})

	const dryRunOutcomes = await collectDryRunOutcomes(toDryRun, cwd, profile)
	const { tasksToRun, filesToBackup, checkErrors } = processDryRunOutcomes(
		dryRunOutcomes,
		perTask,
	)

	await backupAndManifest(cwd, filesToBackup)
	await collectAndInstallDeps({ cwd, profile, tasksToRun, quiet })
	const { applied, errors } = await executeApplyTasks({
		tasksToRun,
		cwd,
		profile,
		perTask,
		spinner: s,
	})

	if (!quiet) console.log('')
	return {
		applied,
		skipped: skippedInCheck,
		errors: [...checkErrors, ...errors],
		timing: { applyMs: performance.now() - applyStart, tasks: perTask },
	}
}
