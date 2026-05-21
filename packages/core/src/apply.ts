import { spinner } from '@clack/prompts'
import { Effect } from 'effect'
import type { Task, TaskStatus } from '@/_base.js'
import { backupFile } from '@/backup.js'
import type { ProjectProfile } from '@/detect.js'
import { TaskError } from '@/errors.js'
import { logError, logInfo, pc } from '@/utils/logger.js'
import { statusTag } from '@/utils/tags.js'

export interface ApplyOptions {
	includeConflicts?: boolean
	quiet?: boolean
}

export interface ApplyResult {
	applied: number
	skipped: number
	errors: string[]
}

export function applyTasks(
	tasks: Task[],
	cwd: string,
	profile: ProjectProfile,
	selectedIds?: string[],
	options: ApplyOptions = {},
): Promise<ApplyResult> {
	const toApply = selectedIds
		? tasks.filter((t) => selectedIds.includes(t.id))
		: tasks

	const includeConflicts = options.includeConflicts ?? false
	const quiet = options.quiet ?? false

	return runApply(toApply, cwd, profile, includeConflicts, quiet)
}

async function runApply(
	toApply: Task[],
	cwd: string,
	profile: ProjectProfile,
	includeConflicts: boolean,
	quiet: boolean,
): Promise<ApplyResult> {
	const s = quiet ? null : spinner()

	const tasksToRun: { task: Task; status: TaskStatus }[] = []

	// Collect unique filepaths from all tasks that will be applied
	const filesToBackup = new Set<string>()

	for (const task of toApply) {
		try {
			const status = await Effect.runPromise(
				Effect.tryPromise({
					try: (_signal) => task.check(cwd, profile),
					catch: (cause) =>
						new TaskError({
							taskId: task.id,
							message: `Failed to check ${task.id}`,
							cause,
						}),
				}),
			)
			if (status === 'skip') continue
			if (status === 'conflict' && !includeConflicts) {
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
			logError(`Failed to check/dryRun ${task.id}: ${message}`)
		}
	}

	// Backup each unique file only once before applying any tasks
	for (const filepath of filesToBackup) {
		await backupFile(cwd, filepath)
	}

	let applied = 0
	const errors: string[] = []

	for (const { task, status } of tasksToRun) {
		try {
			s?.start(`Applying ${task.label}`)
			await Effect.runPromise(
				Effect.tryPromise({
					try: (_signal) => task.apply(cwd, profile),
					catch: (cause) => {
						const causeMsg =
							cause instanceof Error ? cause.message : String(cause)
						return new TaskError({
							taskId: task.id,
							message: causeMsg,
							cause,
						})
					},
				}),
			)
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

	const skipped = toApply.length - applied - errors.length
	console.log('')
	return { applied, skipped, errors }
}
