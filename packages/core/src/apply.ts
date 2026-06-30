import { spinner } from '@clack/prompts'
import { Effect } from 'effect'
import type { Task, TaskStatus } from '@/_base.js'
import { backupFile, writeRunManifest } from '@/backup.js'
import type { ProjectProfile } from '@/detect.js'
import { TaskError } from '@/errors.js'
import type { ApplyTiming, TaskTiming } from '@/timing.js'
import { logError, logInfo, pc } from '@/utils/logger.js'
import { statusTag } from '@/utils/tags.js'

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
	/** Optional precomputed task statuses from the resolve phase.
	 * When provided, the apply pipeline skips redundant task.check() calls. */
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
	const {
		tasks: toApply,
		cwd,
		profile,
		includeConflicts,
		quiet,
		statuses,
	} = options
	const applyStart = performance.now()
	const perTask: TaskTiming[] = []
	const s = quiet ? null : spinner()

	const tasksToRun: { task: Task; status: TaskStatus }[] = []

	const filesToBackup = new Set<string>()
	let skippedInCheck = 0

	for (const task of toApply) {
		try {
			const checkStart = performance.now()
			const status =
				statuses?.get(task.id) ??
				(await Effect.runPromise(
					Effect.tryPromise({
						try: (_signal) => task.check(cwd, profile),
						catch: (cause) =>
							new TaskError({
								taskId: task.id,
								message: `Failed to check ${task.id}`,
								cause,
							}),
					}),
				))
			const checkMs = performance.now() - checkStart
			if (status === 'skip') {
				perTask.push({ id: task.id, label: task.label, checkMs })
				skippedInCheck++
				continue
			}
			if (status === 'conflict' && !includeConflicts) {
				logInfo(`Skipping conflict: ${task.label} (${task.id})`)
				skippedInCheck++
				continue
			}
			const dryRunStart = performance.now()
			const diffs = await Effect.runPromise(
				Effect.tryPromise({
					try: (_signal) => task.dryRun(cwd, profile),
					catch: (cause) =>
						new TaskError({
							taskId: task.id,
							message: `Failed to dryRun ${task.id}`,
							cause,
						}),
				}),
			)
			const dryRunMs = performance.now() - dryRunStart
			for (const diff of diffs) {
				filesToBackup.add(diff.filepath)
			}
			tasksToRun.push({ task, status })
			perTask.push({ id: task.id, label: task.label, checkMs, dryRunMs })
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			logError(`Failed to check/dryRun ${task.id}: ${message}`)
		}
	}

	// Backup each unique file only once before applying any tasks
	for (const filepath of filesToBackup) {
		await backupFile(cwd, filepath)
	}

	// Write manifest so `undo` can restore all files from this run
	if (filesToBackup.size > 0) {
		await writeRunManifest(cwd, [...filesToBackup])
	}

	let applied = 0
	const errors: string[] = []

	for (const { task, status } of tasksToRun) {
		try {
			const applyStartTime = performance.now()
			s?.start(`Applying ${task.label}`)
			await Effect.runPromise(
				Effect.tryPromise({
					try: (_signal) => task.apply(cwd, profile),
					catch: (cause) => {
						const causeMsg =
							cause instanceof Error ? cause.message : String(cause)
						return new TaskError({
							taskId: task.id,
							message: causeMsg,
							cause,
						})
					},
				}),
			)
			const applyMs = performance.now() - applyStartTime
			applied++
			const entry = perTask.find((t) => t.id === task.id)
			if (entry) entry.applyMs = applyMs
			s?.stop(`${statusTag(status)} ${task.label}`)
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			errors.push(`${task.id}: ${message}`)
			if (s) {
				s.stop(`${pc.red('✗')} ${task.label} - ${message}`)
			} else {
				logError(`Failed to apply ${task.id}: ${message}`)
			}
		}
	}

	const skipped = skippedInCheck
	const applyMs = performance.now() - applyStart
	console.log('')
	return { applied, skipped, errors, timing: { applyMs, tasks: perTask } }
}
