import fs from 'node:fs/promises'
import { Effect } from 'effect'
import { dirname } from 'pathe'
import { FileSystemError } from '@/errors.js'
import { resolvePath } from '@/utils/fs.js'
import { ROOT_DETECTOR_INPUTS } from './root-inputs.js'
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
	rootInputs: PathFingerprint[]
	ancestorInputs: PathFingerprint[]
}

export interface ProfileCacheEntry {
	version: 2
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

const ANCESTOR_MARKER_FILES = [
	'pnpm-workspace.yaml',
	'turbo.json',
	'nx.json',
	'lerna.json',
]

const ANCESTOR_MARKER_DIRS = ['packages', 'apps']

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
					const dirPath = resolvePath(cwd, dir)
					try {
						const entries = await fs.readdir(dirPath, {
							recursive: true,
							withFileTypes: true,
						})
						const entryStats: PathFingerprint[] = []
						for (const entry of entries) {
							if (entry.isFile()) {
								const parent =
									(entry as unknown as { parentPath?: string; path?: string })
										.parentPath ??
									(entry as unknown as { parentPath?: string; path?: string })
										.path ??
									dirPath
								const fullPath = resolvePath(String(parent), entry.name)
								const s = await fs.stat(fullPath)
								entryStats.push({
									path: fullPath,
									mtimeMs: s.mtimeMs,
									size: s.size,
								})
							}
						}
						// If directory is empty, stat the directory itself so it still appears in the fingerprint
						if (entryStats.length === 0) {
							const s = await fs.stat(dirPath)
							entryStats.push({
								path: dirPath,
								mtimeMs: s.mtimeMs,
								size: s.size,
							})
						}
						return entryStats
					} catch {
						return [] as PathFingerprint[]
					}
				}),
			).then((results) => results.flat()),
		catch: (cause) => new FileSystemError({ path: cwd, cause }),
	}).pipe(Effect.orElseSucceed(() => []))
}

function fingerprintRootInputs(
	cwd: string,
): Effect.Effect<PathFingerprint[], never> {
	return Effect.tryPromise({
		try: async () => {
			const entryStats: PathFingerprint[] = []
			for (const input of ROOT_DETECTOR_INPUTS) {
				const names =
					input.extensions.length === 0
						? [input.basename]
						: input.extensions.map((ext) => `${input.basename}${ext}`)
				for (const name of names) {
					const filePath = resolvePath(cwd, name)
					try {
						const s = await fs.stat(filePath)
						if (s.isFile()) {
							entryStats.push({
								path: filePath,
								mtimeMs: s.mtimeMs,
								size: s.size,
							})
						}
					} catch {
						// Absent or unreadable inputs simply don't contribute
					}
				}
			}
			return entryStats
		},
		catch: (cause) => new FileSystemError({ path: cwd, cause }),
	}).pipe(Effect.orElseSucceed(() => []))
}

function fingerprintAncestorInputs(
	cwd: string,
): Effect.Effect<PathFingerprint[], never> {
	const names = [...ANCESTOR_MARKER_FILES, ...ANCESTOR_MARKER_DIRS]
	return Effect.tryPromise({
		try: async () => {
			const entryStats: PathFingerprint[] = []
			let current = dirname(cwd)
			while (current !== dirname(current)) {
				for (const name of names) {
					const inputPath = resolvePath(current, name)
					try {
						await fs.access(inputPath)
						entryStats.push({ path: inputPath, mtimeMs: 0, size: 0 })
					} catch {
						// Absent inputs don't contribute
					}
				}
				const gitPath = resolvePath(current, '.git')
				try {
					await fs.access(gitPath)
					entryStats.push({ path: gitPath, mtimeMs: 0, size: 0 })
					break
				} catch {
					// No .git here, keep walking up
				}
				current = dirname(current)
			}
			return entryStats
		},
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
			const rootInputs = yield* fingerprintRootInputs(cwd)
			const ancestorInputs = yield* fingerprintAncestorInputs(cwd)

			return {
				packageJson: packageJson ?? {
					path: pkgJsonPath,
					mtimeMs: 0,
					size: 0,
				},
				lockfile,
				configDirs,
				rootInputs,
				ancestorInputs,
			}
		}),
	)
}

export function isCacheValid(
	stored: ProfileCacheEntry,
	current: ProjectFingerprint,
): boolean {
	if (stored.version !== 2) {
		return false
	}

	const s = stored.fingerprint
	const c = current

	if (
		s.packageJson.path !== c.packageJson.path ||
		s.packageJson.mtimeMs !== c.packageJson.mtimeMs ||
		s.packageJson.size !== c.packageJson.size
	) {
		return false
	}

	if (s.lockfile === null && c.lockfile !== null) {
		return false
	}
	if (s.lockfile !== null && c.lockfile === null) {
		return false
	}
	if (s.lockfile !== null && c.lockfile !== null) {
		if (
			s.lockfile.path !== c.lockfile.path ||
			s.lockfile.mtimeMs !== c.lockfile.mtimeMs ||
			s.lockfile.size !== c.lockfile.size
		) {
			return false
		}
	}

	if (!samePathFingerprints(s.configDirs, c.configDirs)) {
		return false
	}
	if (!samePathFingerprints(s.rootInputs, c.rootInputs)) {
		return false
	}

	const sAncestors = s.ancestorInputs
	if (!sAncestors || !samePathFingerprints(sAncestors, c.ancestorInputs)) {
		return false
	}

	return true
}

function samePathFingerprints(
	stored: PathFingerprint[],
	current: PathFingerprint[],
): boolean {
	if (stored.length !== current.length) {
		return false
	}

	const storedByPath = new Map(stored.map((d) => [d.path, d]))
	for (const fp of current) {
		const match = storedByPath.get(fp.path)
		if (!match || match.mtimeMs !== fp.mtimeMs || match.size !== fp.size) {
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
			try: async () => {
				const content = await fs.readFile(cacheFilePath(cwd), 'utf-8')
				const parsed = JSON.parse(content) as unknown
				if (!isValidCacheEntry(parsed)) {
					return null
				}
				return parsed
			},
			catch: (cause) =>
				new FileSystemError({ path: cacheFilePath(cwd), cause }),
		}).pipe(Effect.orElseSucceed(() => null)),
	)
}

function isValidCacheEntry(value: unknown): value is ProfileCacheEntry {
	if (typeof value !== 'object' || value === null) {
		return false
	}
	const entry = value as Record<string, unknown>
	if (entry.version !== 2) {
		return false
	}
	if (typeof entry.fingerprint !== 'object' || entry.fingerprint === null) {
		return false
	}
	if (typeof entry.profile !== 'object' || entry.profile === null) {
		return false
	}
	const fp = entry.fingerprint as Record<string, unknown>
	if (typeof fp.packageJson !== 'object' || fp.packageJson === null) {
		return false
	}
	if (!Array.isArray(fp.rootInputs)) {
		return false
	}
	if (!Array.isArray(fp.ancestorInputs)) {
		return false
	}
	return true
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
			)

			const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`
			const data = `${JSON.stringify(entry, null, 2)}\n`

			yield* Effect.tryPromise(() => fs.writeFile(tempPath, data, 'utf-8'))

			yield* Effect.tryPromise(async () => {
				try {
					// Re-ensure dir exists (may have been cleaned up by parallel process)
					await fs.mkdir(dir, { recursive: true })
					await fs.rename(tempPath, filePath)
				} catch (error) {
					await fs.unlink(tempPath).catch(() => {})
					throw error
				}
			})
		}),
	)
}
