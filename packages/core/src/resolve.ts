import { Effect } from 'effect'
import type { Task, TaskStatus } from '@/_base.js'
import type { ProjectProfile } from '@/detect.js'
import { detectProject } from '@/detect.js'
import { TaskError } from '@/errors.js'
import type { ResolveTiming } from '@/timing.js'
import { logWarn } from '@/utils/logger.js'

export function resolveTasks(
	profile: ProjectProfile,
	allTasks: Task[],
): Task[] {
	return allTasks.filter((task) => {
		if (!task.applicable(profile)) return false

		// Scope filtering for monorepos
		if (profile.monorepo) {
			const scope = task.scope ?? 'both'
			if (profile.workspaceRoot && scope === 'package') return false
			if (!profile.workspaceRoot && scope === 'root') return false
		}

		return true
	})
}

function checkTask(
	task: Task,
	cwd: string,
	profile: ProjectProfile,
): Effect.Effect<TaskStatus, never> {
	return Effect.tryPromise({
		try: (_signal) => task.check(cwd, profile),
		catch: (cause) =>
			new TaskError({
				taskId: task.id,
				message: `Failed to check ${task.id}`,
				cause,
			}),
	}).pipe(
		Effect.catchTag('TaskError', (error) => {
			const detail =
				error.cause instanceof Error ? error.cause.message : String(error.cause)
			logWarn(`Failed to check ${task.id}: ${detail}`)
			return Effect.succeed('conflict' as TaskStatus)
		}),
	)
}

function checkTaskWithTiming(
	task: Task,
	cwd: string,
	profile: ProjectProfile,
): Effect.Effect<[string, TaskStatus, number], never> {
	return Effect.gen(function* () {
		const start = performance.now()
		const status = yield* checkTask(task, cwd, profile)
		const duration = performance.now() - start
		return [task.id, status, duration] as [string, TaskStatus, number]
	})
}

function runConcurrent<T>(
	tasks: Task[],
	makeEffect: (task: Task) => Effect.Effect<T, never>,
): Promise<T[]> {
	return Effect.runPromise(
		Effect.all(tasks.map(makeEffect), { concurrency: 8 }),
	)
}

export function resolveTaskStatuses(
	tasks: Task[],
	cwd: string,
	profile: ProjectProfile,
): Promise<Map<string, TaskStatus>> {
	return runConcurrent(tasks, (task) =>
		checkTask(task, cwd, profile).pipe(
			Effect.map((status) => [task.id, status] as [string, TaskStatus]),
		),
	).then((entries) => new Map(entries))
}

async function resolveStatusesWithTiming(
	tasks: Task[],
	cwd: string,
	profile: ProjectProfile,
): Promise<{ statuses: Map<string, TaskStatus>; checkSumMs: number }> {
	const results = await runConcurrent(tasks, (task) =>
		checkTaskWithTiming(task, cwd, profile),
	)
	const statuses = new Map(
		results.map(([id, status]) => [id, status] as [string, TaskStatus]),
	)
	const checkSumMs = results.reduce((sum, [, , duration]) => sum + duration, 0)
	return { statuses, checkSumMs }
}

export async function resolveProjectTasks(
	cwd: string,
	allTasks: Task[],
	externalTasks?: Task[],
): Promise<{
	profile: ProjectProfile
	tasks: Task[]
	statuses: Map<string, TaskStatus>
	timing: ResolveTiming
}> {
	const detectionStart = performance.now()
	const profile = await detectProject(cwd)
	const detectionMs = performance.now() - detectionStart

	const mergedTasks: Task[] = externalTasks
		? [
				...new Map(
					[...allTasks, ...externalTasks].map((t) => [t.id, t]),
				).values(),
			]
		: allTasks
	const applicableTasks = resolveTasks(profile, mergedTasks)

	const resolutionStart = performance.now()
	const { statuses, checkSumMs } = await resolveStatusesWithTiming(
		applicableTasks,
		cwd,
		profile,
	)
	const resolutionMs = performance.now() - resolutionStart

	return {
		profile,
		tasks: applicableTasks,
		statuses,
		timing: { detectionMs, resolutionMs, resolutionSumMs: checkSumMs },
	}
}
