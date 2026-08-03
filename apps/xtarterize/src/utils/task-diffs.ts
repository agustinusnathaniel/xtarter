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
	const diffs: FileDiff[] = []
	let failures = 0
	for (const task of tasks) {
		try {
			const taskDiffs = await task.dryRun(cwd, profile)
			diffs.push(...taskDiffs)
		} catch (error) {
			failures++
			const message = error instanceof Error ? error.message : String(error)
			logError(`Failed to dryRun ${task.id}: ${message}`)
		}
	}
	return { diffs, failures }
}
