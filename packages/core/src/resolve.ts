import { Effect } from 'effect'
import type { Task, TaskStatus } from '@/_base.js'
import type { ProjectProfile } from '@/detect.js'
import { detectProject } from '@/detect.js'
import { TaskError } from '@/errors.js'
import type { ResolveTiming } from '@/timing.js'

export function resolveTasks(
	profile: ProjectProfile,
	allTasks: Task[],
): Task[] {
	return allTasks.filter((task) => task.applicable(profile))
}

export function resolveTaskStatuses(
	tasks: Task[],
	cwd: string,
	profile: ProjectProfile,
): Promise<Map<string, TaskStatus>> {
	return Effect.runPromise(
		Effect.all(
			tasks.map((task) =>
				Effect.tryPromise({
					try: (_signal) => task.check(cwd, profile),
					catch: (cause) =>
						new TaskError({
							taskId: task.id,
							message: `Failed to check ${task.id}`,
							cause,
						}),
				}).pipe(
					Effect.map((status) => [task.id, status] as [string, TaskStatus]),
				),
			),
		).pipe(Effect.map((entries) => new Map(entries))),
	)
}

async function resolveStatusesWithTiming(
	tasks: Task[],
	cwd: string,
	profile: ProjectProfile,
): Promise<{ statuses: Map<string, TaskStatus>; checkSumMs: number }> {
	const checkDurations: number[] = []
	const statuses = await Effect.runPromise(
		Effect.all(
			tasks.map((task) =>
				Effect.tryPromise({
					try: async (_signal) => {
						const start = performance.now()
						const status = await task.check(cwd, profile)
						checkDurations.push(performance.now() - start)
						return status
					},
					catch: (cause) =>
						new TaskError({
							taskId: task.id,
							message: `Failed to check ${task.id}`,
							cause,
						}),
				}).pipe(
					Effect.map((status) => [task.id, status] as [string, TaskStatus]),
				),
			),
		).pipe(Effect.map((entries) => new Map(entries))),
	)
	return {
		statuses,
		checkSumMs: checkDurations.reduce((a, b) => a + b, 0),
	}
}

export async function resolveProjectTasks(
	cwd: string,
	allTasks: Task[],
): Promise<{
	profile: ProjectProfile
	tasks: Task[]
	statuses: Map<string, TaskStatus>
	timing: ResolveTiming
}> {
	const detectionStart = performance.now()
	const profile = await detectProject(cwd)
	const detectionMs = performance.now() - detectionStart

	const applicableTasks = resolveTasks(profile, allTasks)

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
