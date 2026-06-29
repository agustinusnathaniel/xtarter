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
			const safeName = normalize(filepath)
				.replace(/_/g, '__') // escape underscore first
				.replace(/\//g, '_s') // slash → _s
				.replace(/\\/g, '_b') // backslash → _b
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
		try {
			await fs.rename(tempPath, indexPath)
		} catch (error) {
			await fs.unlink(tempPath).catch(() => {})
			throw error
		}
	})
}

export function listBackups(cwd: string, filepath: string): Promise<Backup[]> {
	const indexPath = resolvePath(cwd, BACKUP_DIR, '.index.json')
	return Effect.runPromise(
		Effect.orElseSucceed(
			tryIo(indexPath, async () => {
				const content = await fs.readFile(indexPath, 'utf-8')
				const index = JSON.parse(content) as Record<string, unknown>
				if (!index[filepath] || !Array.isArray(index[filepath]))
					return [] as Backup[]
				return (index[filepath] as unknown[])
					.filter(
						(entry): entry is Backup =>
							typeof entry === 'object' &&
							entry !== null &&
							typeof (entry as Backup).filepath === 'string' &&
							typeof (entry as Backup).backupPath === 'string' &&
							typeof (entry as Backup).timestamp === 'string',
					)
					.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
			}),
			() => [] as Backup[],
		),
	)
}

export function restoreBackup(cwd: string, backup: Backup): Promise<void> {
	if (!backup.backupPath || !backup.filepath) {
		return Promise.reject(
			new BackupError({
				path: backup.backupPath ?? 'unknown',
				cause: new Error('Invalid backup: missing filepath or backupPath'),
			}),
		)
	}
	const resolvedDest = resolvePath(cwd, backup.filepath)
	const resolvedCwd = resolvePath(cwd)
	if (
		!resolvedDest.startsWith(`${resolvedCwd}/`) &&
		resolvedDest !== resolvedCwd
	) {
		return Promise.reject(
			new BackupError({
				path: backup.filepath,
				cause: new Error(`Path traversal detected: ${backup.filepath}`),
			}),
		)
	}

	return Effect.runPromise(
		tryIo(backup.backupPath, () => fs.cp(backup.backupPath, resolvedDest)),
	)
}

export interface RunManifest {
	timestamp: string
	files: string[]
}

export async function writeRunManifest(
	cwd: string,
	files: string[],
): Promise<void> {
	const manifestPath = resolvePath(cwd, BACKUP_DIR, 'last-run.json')
	const manifest: RunManifest = {
		timestamp: new Date().toISOString(),
		files,
	}
	await fs.mkdir(resolvePath(cwd, BACKUP_DIR), { recursive: true })
	await fs.writeFile(
		manifestPath,
		`${JSON.stringify(manifest, null, 2)}\n`,
		'utf-8',
	)
}

export async function readRunManifest(
	cwd: string,
): Promise<RunManifest | null> {
	const manifestPath = resolvePath(cwd, BACKUP_DIR, 'last-run.json')
	try {
		const content = await fs.readFile(manifestPath, 'utf-8')
		return JSON.parse(content) as RunManifest
	} catch {
		return null
	}
}

export async function listAllBackups(
	cwd: string,
): Promise<Record<string, Backup[]>> {
	const indexPath = resolvePath(cwd, BACKUP_DIR, '.index.json')
	try {
		const content = await fs.readFile(indexPath, 'utf-8')
		return JSON.parse(content) as Record<string, Backup[]>
	} catch {
		return {}
	}
}
