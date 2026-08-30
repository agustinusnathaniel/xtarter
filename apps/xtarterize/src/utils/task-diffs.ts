import type { FileDiff, ProjectProfile, Task } from '@xtarterize/core'
import { logError } from '@xtarterize/core'
import { Effect } from 'effect'

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
	const results = await Effect.runPromise(
		Effect.all(
			tasks.map((task) =>
				Effect.tryPromise({
					try: () => task.dryRun(cwd, profile),
					catch: (cause: unknown) => cause,
				}).pipe(
					Effect.tapError((cause: unknown) =>
						Effect.sync(() => {
							const message =
								cause instanceof Error ? cause.message : String(cause)
							logError(`Failed to dryRun ${task.id}: ${message}`)
						}),
					),
					Effect.orElseSucceed(() => null as FileDiff[] | null),
				),
			),
			{ concurrency: 8 },
		),
	)
	const failures = results.filter((r: FileDiff[] | null) => r === null).length
	const diffs = results
		.filter((r: FileDiff[] | null): r is FileDiff[] => r !== null)
		.flat()
	return { diffs, failures }
}
