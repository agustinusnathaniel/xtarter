import { Effect } from 'effect'
import type { Task, TaskStatus } from '@/_base.js'
import type { ProjectProfile } from '@/detect.js'
import { detectProject } from '@/detect.js'

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
						new Error(`Failed to check ${task.id}: ${String(cause)}`),
				}).pipe(
					Effect.map((status) => [task.id, status] as [string, TaskStatus]),
				),
			),
		).pipe(Effect.map((entries) => new Map(entries))),
	)
}

export async function resolveProjectTasks(
	cwd: string,
	allTasks: Task[],
): Promise<{
	profile: ProjectProfile
	tasks: Task[]
	statuses: Map<string, TaskStatus>
}> {
	const profile = await detectProject(cwd)
	const tasks = resolveTasks(profile, allTasks)
	const statuses = await resolveTaskStatuses(tasks, cwd, profile)
	return { profile, tasks, statuses }
}
