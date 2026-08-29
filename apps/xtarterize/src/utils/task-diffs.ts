import type { FileDiff, ProjectProfile, Task } from '@xtarterize/core'
import { logError } from '@xtarterize/core'

/**
 * Collect FileDiffs from a list of tasks, logging per-task failures
 * instead of aborting the whole run. Returns the collected diffs along
 * with the number of tasks whose dryRun failed.
 */
export async function collectTaskDiffs(
	tasks: Task[],
	cwd: string,
	profile: ProjectProfile,
): Promise<{ diffs: FileDiff[]; failures: number }> {
	const concurrency = 8
	const results: (FileDiff[] | null)[] = Array.from({
		length: tasks.length,
	})
	let failures = 0
	let nextIndex = 0

	async function worker(): Promise<void> {
		while (true) {
			const current = nextIndex++
			if (current >= tasks.length) break
			const task = tasks[current]
			if (!task) continue
			try {
				results[current] = await task.dryRun(cwd, profile)
			} catch (error) {
				failures++
				const message = error instanceof Error ? error.message : String(error)
				logError(`Failed to dryRun ${task.id}: ${message}`)
				results[current] = null
			}
		}
	}

	const workers = Array.from(
		{ length: Math.min(concurrency, tasks.length) },
		() => worker(),
	)
	await Promise.all(workers)
	const diffs = results.filter((r): r is FileDiff[] => r !== null).flat()
	return { diffs, failures }
}
