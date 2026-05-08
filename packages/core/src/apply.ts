import type { Task } from '@/_base.js'
import { backupFile } from '@/backup.js'
import type { ProjectProfile } from '@/detect.js'
import { logError, logInfo, logSuccess } from '@/utils/logger.js'

export async function applyTasks(
	tasks: Task[],
	cwd: string,
	profile: ProjectProfile,
	selectedIds?: string[],
	options: { includeConflicts?: boolean } = {},
): Promise<{ applied: number; skipped: number; errors: string[] }> {
	const toApply = selectedIds
		? tasks.filter((t) => selectedIds.includes(t.id))
		: tasks
	const includeConflicts = options.includeConflicts ?? false

	let applied = 0
	let skipped = 0
	const errors: string[] = []

	// Collect unique filepaths from all tasks that will be applied
	const filesToBackup = new Set<string>()
	const tasksToRun: Task[] = []

	for (const task of toApply) {
		try {
			const status = await task.check(cwd, profile)
			if (status === 'skip') {
				skipped++
				continue
			}
			if (status === 'conflict' && !includeConflicts) {
				skipped++
				logInfo(`Skipping conflict: ${task.label} (${task.id})`)
				continue
			}
			tasksToRun.push(task)
			const diffs = await task.dryRun(cwd, profile)
			for (const diff of diffs) {
				filesToBackup.add(diff.filepath)
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			errors.push(`${task.id}: ${message}`)
			logError(`Failed to check/dryRun ${task.id}: ${message}`)
		}
	}

	// Backup each unique file only once before applying any tasks
	for (const filepath of filesToBackup) {
		await backupFile(cwd, filepath)
	}

	for (const task of tasksToRun) {
		try {
			logInfo(`Applying: ${task.label} (${task.id})`)
			await task.apply(cwd, profile)
			applied++
			logSuccess(`${task.label} applied successfully`)
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			errors.push(`${task.id}: ${message}`)
			logError(`Failed to apply ${task.id}: ${message}`)
		}
	}

	return { applied, skipped, errors }
}
