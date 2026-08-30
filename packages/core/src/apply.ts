import { spinner } from '@clack/prompts'
import { Effect } from 'effect'
import type { Task, TaskStatus } from '@/_base.js'
import { backupFile, writeRunManifest } from '@/backup.js'
import type { ProjectProfile } from '@/detect.js'
import { TaskError } from '@/errors.js'
import { checkTask } from '@/resolve.js'
import type { ApplyTiming, TaskTiming } from '@/timing.js'
import { logError, logInfo, pc } from '@/utils/logger.js'
import { installDependenciesBatch } from '@/utils/pkg.js'
import { statusTag } from '@/utils/tags.js'

const CONCURRENCY = 8

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

	// Phase 1: concurrent check collection (deduplicating helper via checkTask)
	const checkResults = await Effect.runPromise(
		Effect.all(
			toApply.map((task) => {
				const precomputed = statuses?.get(task.id)
				if (precomputed !== undefined) {
					return Effect.succeed({
						task,
						status: precomputed,
						checkMs: 0,
					} as const)
				}
				return Effect.gen(function* () {
					const start = performance.now()
					const status = yield* checkTask(task, cwd, profile)
					const checkMs = performance.now() - start
					return { task, status, checkMs } as const
				})
			}),
			{ concurrency: CONCURRENCY },
		),
	)

	let skippedInCheck = 0
	const toDryRun: { task: Task; status: TaskStatus; checkMs: number }[] = []

	for (const result of checkResults) {
		if (result.status === 'skip') {
			perTask.push({
				id: result.task.id,
				label: result.task.label,
				checkMs: result.checkMs,
			})
			skippedInCheck++
			continue
		}
		if (result.status === 'conflict' && !includeConflicts) {
			if (!quiet) {
				logInfo(`Skipping conflict: ${result.task.label} (${result.task.id})`)
			}
			perTask.push({
				id: result.task.id,
				label: result.task.label,
				checkMs: result.checkMs,
			})
			skippedInCheck++
			continue
		}
		toDryRun.push(result)
	}

	// Phase 2: concurrent dryRun collection (only dryRun failures go to checkErrors)
	const checkErrors: string[] = []

	type DryRunSuccess = {
		kind: 'success'
		task: Task
		status: TaskStatus
		checkMs: number
		dryRunMs: number
		diffs: { filepath: string }[]
	}
	type DryRunFailure = {
		kind: 'failure'
		task: Task
		checkMs: number
		errorMsg: string
	}
	type DryRunOutcome = DryRunSuccess | DryRunFailure

	const dryRunOutcomes: DryRunOutcome[] = await Effect.runPromise(
		Effect.all(
			toDryRun.map(({ task, status, checkMs }) =>
				Effect.gen(function* () {
					const start = performance.now()
					const diffs = yield* Effect.tryPromise({
						try: () => task.dryRun(cwd, profile),
						catch: (cause) =>
							new TaskError({
								taskId: task.id,
								message: `Failed to dryRun ${task.id}`,
								cause,
							}),
					})
					const dryRunMs = performance.now() - start
					return {
						kind: 'success' as const,
						task,
						status,
						checkMs,
						dryRunMs,
						diffs,
					}
				}).pipe(
					Effect.catch((error: unknown) =>
						Effect.sync(() => {
							const message =
								error instanceof Error ? error.message : String(error)
							logError(`Failed to check/dryRun ${task.id}: ${message}`)
							return {
								kind: 'failure' as const,
								task,
								checkMs,
								errorMsg: `${task.id}: ${message}`,
							}
						}),
					),
				),
			),
			{ concurrency: CONCURRENCY },
		),
	)

	const tasksToRun: { task: Task; status: TaskStatus }[] = []
	const filesToBackup = new Set<string>()

	for (const outcome of dryRunOutcomes) {
		if (outcome.kind === 'failure') {
			checkErrors.push(outcome.errorMsg)
			continue
		}
		for (const diff of outcome.diffs) {
			filesToBackup.add(diff.filepath)
		}
		tasksToRun.push({ task: outcome.task, status: outcome.status })
		perTask.push({
			id: outcome.task.id,
			label: outcome.task.label,
			checkMs: outcome.checkMs,
			dryRunMs: outcome.dryRunMs,
		})
	}

	// Backup each unique file only once before applying any tasks
	for (const filepath of filesToBackup) {
		await backupFile(cwd, filepath)
	}

	// Write manifest so `undo` can restore all files from this run
	if (filesToBackup.size > 0) {
		await writeRunManifest(cwd, [...filesToBackup])
	}

	// Phase: batch-install all needed deps across all tasks (concurrently collected)
	const depArrays = await Effect.runPromise(
		Effect.all(
			tasksToRun.map(({ task }) =>
				Effect.promise(() =>
					task.getDeps
						? task.getDeps(cwd, profile)
						: Promise.resolve([] as { depName: string; dev: boolean }[]),
				),
			),
			{ concurrency: CONCURRENCY },
		),
	)
	const allDeps = depArrays.flat()
	if (allDeps.length > 0) {
		try {
			// In quiet mode (CI, --json), pipe the package manager's output
			// instead of inheriting it so stdout stays machine-readable.
			await installDependenciesBatch(cwd, allDeps, { silent: quiet })
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			logError(`Failed to batch-install dependencies: ${message}`)
		}
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
	if (!quiet) console.log('')
	return {
		applied,
		skipped,
		errors: [...checkErrors, ...errors],
		timing: { applyMs, tasks: perTask },
	}
}
