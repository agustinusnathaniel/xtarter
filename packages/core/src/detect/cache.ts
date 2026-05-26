import fs from 'node:fs/promises'
import { Effect } from 'effect'
import { dirname } from 'pathe'
import { FileSystemError } from '@/errors.js'
import { resolvePath } from '@/utils/fs.js'
import type { ProjectProfile } from './types.js'

export interface PathFingerprint {
	path: string
	mtimeMs: number
	size: number
}

export interface ProjectFingerprint {
	packageJson: PathFingerprint
	lockfile: PathFingerprint | null
	configDirs: PathFingerprint[]
}

export interface ProfileCacheEntry {
	version: 1
	fingerprint: ProjectFingerprint
	profile: ProjectProfile
	computedAt: string
	durationMs: number
}

const LOCKFILE_NAMES = [
	'pnpm-lock.yaml',
	'yarn.lock',
	'bun.lockb',
	'package-lock.json',
]

const CONFIG_DIRS = ['.github', '.vscode', '.changeset']

function statOrFail(
	filePath: string,
): Effect.Effect<PathFingerprint, FileSystemError> {
	return Effect.tryPromise({
		try: () =>
			fs.stat(filePath).then(
				(s) =>
					({
						path: filePath,
						mtimeMs: s.mtimeMs,
						size: s.size,
					}) as PathFingerprint,
			),
		catch: (cause) => new FileSystemError({ path: filePath, cause }),
	})
}

function statPath(
	filePath: string,
): Effect.Effect<PathFingerprint | null, never> {
	return statOrFail(filePath).pipe(Effect.orElseSucceed(() => null))
}

function findLockfile(
	cwd: string,
): Effect.Effect<PathFingerprint | null, never> {
	return Effect.firstSuccessOf(
		LOCKFILE_NAMES.map((name) => statOrFail(resolvePath(cwd, name))),
	).pipe(Effect.orElseSucceed(() => null))
}

function fingerprintConfigDirs(
	cwd: string,
): Effect.Effect<PathFingerprint[], never> {
	return Effect.tryPromise({
		try: () =>
			Promise.all(
				CONFIG_DIRS.map(async (dir) => {
					const filePath = resolvePath(cwd, dir)
					try {
						const s = await fs.stat(filePath)
						return {
							path: filePath,
							mtimeMs: s.mtimeMs,
							size: s.size,
						} as PathFingerprint
					} catch {
						return null
					}
				}),
			).then((results) =>
				results.filter((r): r is PathFingerprint => r !== null),
			),
		catch: (cause) => new FileSystemError({ path: cwd, cause }),
	}).pipe(Effect.orElseSucceed(() => []))
}

export function computeFingerprint(cwd: string): Promise<ProjectFingerprint> {
	return Effect.runPromise(
		Effect.gen(function* () {
			const pkgJsonPath = resolvePath(cwd, 'package.json')
			const packageJson = yield* statPath(pkgJsonPath)
			const lockfile = yield* findLockfile(cwd)
			const configDirs = yield* fingerprintConfigDirs(cwd)

			return {
				packageJson: packageJson ?? {
					path: pkgJsonPath,
					mtimeMs: 0,
					size: 0,
				},
				lockfile,
				configDirs,
			}
		}),
	)
}

export function isCacheValid(
	stored: ProfileCacheEntry,
	current: ProjectFingerprint,
): boolean {
	if (stored.version !== 1) return false

	const s = stored.fingerprint
	const c = current

	if (
		s.packageJson.path !== c.packageJson.path ||
		s.packageJson.mtimeMs !== c.packageJson.mtimeMs ||
		s.packageJson.size !== c.packageJson.size
	) {
		return false
	}

	if (s.lockfile === null && c.lockfile !== null) return false
	if (s.lockfile !== null && c.lockfile === null) return false
	if (s.lockfile !== null && c.lockfile !== null) {
		if (
			s.lockfile.path !== c.lockfile.path ||
			s.lockfile.mtimeMs !== c.lockfile.mtimeMs ||
			s.lockfile.size !== c.lockfile.size
		) {
			return false
		}
	}

	if (s.configDirs.length !== c.configDirs.length) return false

	const sDirMap = new Map(s.configDirs.map((d) => [d.path, d]))
	for (const dir of c.configDirs) {
		const stored = sDirMap.get(dir.path)
		if (!stored || stored.mtimeMs !== dir.mtimeMs || stored.size !== dir.size) {
			return false
		}
	}

	return true
}

function cacheFilePath(cwd: string): string {
	return resolvePath(cwd, '.xtarterize', 'cache', 'profile-fingerprint.json')
}

export function readProfileCache(
	cwd: string,
): Promise<ProfileCacheEntry | null> {
	return Effect.runPromise(
		Effect.tryPromise({
			try: () =>
				fs
					.readFile(cacheFilePath(cwd), 'utf-8')
					.then((c) => JSON.parse(c) as ProfileCacheEntry),
			catch: (cause) =>
				new FileSystemError({ path: cacheFilePath(cwd), cause }),
		}).pipe(Effect.orElseSucceed(() => null)),
	)
}

export function writeProfileCache(
	cwd: string,
	entry: ProfileCacheEntry,
): Promise<void> {
	return Effect.runPromise(
		Effect.gen(function* () {
			const filePath = cacheFilePath(cwd)
			const dir = dirname(filePath)
			yield* Effect.tryPromise(() =>
				fs.mkdir(dir, { recursive: true }).then(() => undefined),
			).pipe(Effect.orElseSucceed(() => undefined))

			const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`
			const data = `${JSON.stringify(entry, null, 2)}\n`

			yield* Effect.tryPromise(() =>
				fs.writeFile(tempPath, data, 'utf-8'),
			).pipe(Effect.orElseSucceed(() => undefined))

			yield* Effect.tryPromise(() => fs.rename(tempPath, filePath)).pipe(
				Effect.orElseSucceed(() => undefined),
			)
		}),
	)
}
