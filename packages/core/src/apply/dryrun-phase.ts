import { Effect } from 'effect'
import type { Task, TaskStatus } from '@/_base.js'
import type { ProjectProfile } from '@/detect.js'
import { TaskError } from '@/errors.js'
import type { TaskTiming } from '@/timing.js'
import { logError } from '@/utils/logger.js'

const CONCURRENCY = 8

export type DryRunSuccess = {
	kind: 'success'
	task: Task
	status: TaskStatus
	checkMs: number
	dryRunMs: number
	diffs: { filepath: string }[]
}

export type DryRunFailure = {
	kind: 'failure'
	task: Task
	checkMs: number
	errorMsg: string
}

export type DryRunOutcome = DryRunSuccess | DryRunFailure

export function collectDryRunOutcomes(
	toDryRun: { task: Task; status: TaskStatus; checkMs: number }[],
	cwd: string,
	profile: ProjectProfile,
): Promise<DryRunOutcome[]> {
	return Effect.runPromise(
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
}

export function processDryRunOutcomes(
	dryRunOutcomes: DryRunOutcome[],
	perTask: TaskTiming[],
): {
	tasksToRun: { task: Task; status: TaskStatus }[]
	filesToBackup: Set<string>
	checkErrors: string[]
} {
	const tasksToRun: { task: Task; status: TaskStatus }[] = []
	const filesToBackup = new Set<string>()
	const checkErrors: string[] = []

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

	return { tasksToRun, filesToBackup, checkErrors }
}
