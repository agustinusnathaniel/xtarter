import fs from 'node:fs/promises'
import { Effect } from 'effect'
import { join, normalize } from 'pathe'
import { BackupError } from '@/errors.js'
import { resolvePath } from '@/utils/fs.js'

const BACKUP_DIR = '.xtarterize/backups'

export interface Backup {
	filepath: string
	backupPath: string
	timestamp: string
}

function tryIo<A>(
	path: string,
	f: () => Promise<A>,
): Effect.Effect<A, BackupError> {
	return Effect.tryPromise({
		try: (_signal) => f(),
		catch: (cause) => new BackupError({ path, cause }),
	})
}

export function backupFile(cwd: string, filepath: string): Promise<void> {
	return Effect.runPromise(
		Effect.gen(function* () {
			const sourcePath = resolvePath(cwd, filepath)
			const exists = yield* tryIo(sourcePath, () =>
				fs
					.access(sourcePath)
					.then(() => true)
					.catch(() => false),
			)
			if (!exists) return

			const backupDir = resolvePath(cwd, BACKUP_DIR)
			yield* tryIo(backupDir, () => fs.mkdir(backupDir, { recursive: true }))

			const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
			const safeName = normalize(filepath).replace(/[/\\]/g, '__')
			const backupName = `${safeName}.${timestamp}`
			const backupPath = join(backupDir, backupName)

			yield* tryIo(sourcePath, () => fs.cp(sourcePath, backupPath))

			const indexPath = resolvePath(cwd, BACKUP_DIR, '.index.json')
			const indexContent: Record<string, Backup[]> =
				yield* Effect.orElseSucceed(
					tryIo(indexPath, () =>
						fs.readFile(indexPath, 'utf-8').then((c) => JSON.parse(c)),
					),
					() => ({}),
				)
			const backups = indexContent[filepath] ?? []
			backups.push({ filepath, backupPath, timestamp })
			indexContent[filepath] = backups
			yield* writeIndexAtomically(indexPath, indexContent)
		}),
	)
}

function writeIndexAtomically(
	indexPath: string,
	indexContent: Record<string, Backup[]>,
) {
	const tempPath = `${indexPath}.${process.pid}.${Date.now()}.tmp`
	return tryIo(indexPath, async () => {
		await fs.writeFile(
			tempPath,
			`${JSON.stringify(indexContent, null, 2)}\n`,
			'utf-8',
		)
		await fs.rename(tempPath, indexPath)
	})
}

export function listBackups(cwd: string, filepath: string): Promise<Backup[]> {
	const indexPath = resolvePath(cwd, BACKUP_DIR, '.index.json')
	return Effect.runPromise(
		Effect.orElseSucceed(
			tryIo(indexPath, async () => {
				const content = await fs.readFile(indexPath, 'utf-8')
				const index = JSON.parse(content) as Record<string, Backup[]>
				if (!index[filepath]) return [] as Backup[]
				return index[filepath].sort((a, b) =>
					b.timestamp.localeCompare(a.timestamp),
				)
			}),
			() => [] as Backup[],
		),
	)
}

export function restoreBackup(cwd: string, backup: Backup): Promise<void> {
	return Effect.runPromise(
		tryIo(backup.backupPath, () =>
			fs.cp(backup.backupPath, resolvePath(cwd, backup.filepath)),
		),
	)
}
