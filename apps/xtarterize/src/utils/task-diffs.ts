import type { FileDiff, ProjectProfile, Task } from '@xtarterize/core'
import { logError } from '@xtarterize/core'

/**
 * Collect FileDiffs from a list of tasks, logging per-task failures
 * instead of aborting the whole run.
 */
export async function collectTaskDiffs(
	tasks: Task[],
	cwd: string,
	profile: ProjectProfile,
): Promise<FileDiff[]> {
	const diffs: FileDiff[] = []
	for (const task of tasks) {
		try {
			const taskDiffs = await task.dryRun(cwd, profile)
			diffs.push(...taskDiffs)
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			logError(`Failed to dryRun ${task.id}: ${message}`)
		}
	}
	return diffs
}
