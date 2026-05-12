import { spinner } from '@clack/prompts'
import type { Task, TaskStatus } from '@/_base.js'
import { backupFile } from '@/backup.js'
import type { ProjectProfile } from '@/detect.js'
import { logError, logInfo, pc } from '@/utils/logger.js'
import { statusTag } from '@/utils/tags.js'

export interface ApplyOptions {
	includeConflicts?: boolean
	quiet?: boolean
}

export async function applyTasks(
	tasks: Task[],
	cwd: string,
	profile: ProjectProfile,
	selectedIds?: string[],
	options: ApplyOptions = {},
): Promise<{ applied: number; skipped: number; errors: string[] }> {
	const toApply = selectedIds
		? tasks.filter((t) => selectedIds.includes(t.id))
		: tasks
	const includeConflicts = options.includeConflicts ?? false
	const quiet = options.quiet ?? false

	let applied = 0
	let skipped = 0
	const errors: string[] = []

	// Collect unique filepaths from all tasks that will be applied
	const filesToBackup = new Set<string>()
	const tasksToRun: { task: Task; status: TaskStatus }[] = []

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
			const diffs = await task.dryRun(cwd, profile)
			for (const diff of diffs) {
				filesToBackup.add(diff.filepath)
			}
			tasksToRun.push({ task, status })
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

	const s = quiet ? null : spinner()

	for (const { task, status } of tasksToRun) {
		try {
			s?.start(`Applying ${task.label}`)
			await task.apply(cwd, profile)
			applied++
			s?.stop(`${statusTag(status)} ${task.label}`)
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			errors.push(`${task.id}: ${message}`)
			if (s) {
				s.stop(`${pc.red('✗')} ${task.label} — ${message}`)
			} else {
				logError(`Failed to apply ${task.id}: ${message}`)
			}
		}
	}

	return { applied, skipped, errors }
}
