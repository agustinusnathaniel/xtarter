import { Effect } from 'effect'
import type { Task, TaskStatus } from '@/_base.js'
import type { ProjectProfile } from '@/detect.js'
import { checkTask } from '@/resolve.js'
import type { TaskTiming } from '@/timing.js'
import { logInfo } from '@/utils/logger.js'

const CONCURRENCY = 8

export interface CheckEntry {
	task: Task
	status: TaskStatus
	checkMs: number
}

export function collectCheckResults(options: {
	tasks: Task[]
	cwd: string
	profile: ProjectProfile
	statuses?: ReadonlyMap<string, TaskStatus>
}): Promise<CheckEntry[]> {
	const { tasks, cwd, profile, statuses } = options
	return Effect.runPromise(
		Effect.all(
			tasks.map((task) => {
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
}

function shouldSkip(status: TaskStatus, includeConflicts: boolean): boolean {
	if (status === 'skip') return true
	if (status === 'conflict' && !includeConflicts) return true
	return false
}

function pushSkippedTiming(perTask: TaskTiming[], entry: CheckEntry): void {
	perTask.push({
		id: entry.task.id,
		label: entry.task.label,
		checkMs: entry.checkMs,
	})
}

export function classifyCheckResults(options: {
	checkResults: CheckEntry[]
	includeConflicts: boolean
	quiet: boolean
	perTask: TaskTiming[]
}): { toDryRun: CheckEntry[]; skippedInCheck: number } {
	const { checkResults, includeConflicts, quiet, perTask } = options
	let skippedInCheck = 0
	const toDryRun: CheckEntry[] = []

	for (const result of checkResults) {
		if (!shouldSkip(result.status, includeConflicts)) {
			toDryRun.push(result)
			continue
		}
		if (result.status === 'conflict' && !includeConflicts && !quiet) {
			logInfo(`Skipping conflict: ${result.task.label} (${result.task.id})`)
		}
		pushSkippedTiming(perTask, result)
		skippedInCheck++
	}

	return { toDryRun, skippedInCheck }
}
