import type { Task, TaskStatus } from '@/_base.js'
import type { ProjectProfile } from '@/detect.js'
import { detectProject } from '@/detect.js'

export function resolveTasks(
	profile: ProjectProfile,
	allTasks: Task[],
): Task[] {
	return allTasks.filter((task) => task.applicable(profile))
}

export async function resolveTaskStatuses(
	tasks: Task[],
	cwd: string,
	profile: ProjectProfile,
): Promise<Map<string, TaskStatus>> {
	const results = new Map<string, TaskStatus>()
	const statusPromises = tasks.map(async (task) => {
		const status = await task.check(cwd, profile)
		return [task.id, status] as [string, TaskStatus]
	})

	const entries = await Promise.all(statusPromises)
	for (const [id, status] of entries) {
		results.set(id, status)
	}

	return results
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
