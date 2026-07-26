import type {
	FileDiff,
	ProjectProfile,
	Task,
	TaskScope,
	TaskSearchMeta,
	TaskStatus,
} from '@xtarterize/core'
import {
	fileExists,
	readFile,
	readPackageJson,
	resolvePath,
} from '@xtarterize/core'
import { mergeJson, parseJsonc } from '@xtarterize/patchers'
import JSON5 from 'json5'
import { relative } from 'pathe'
import {
	ensureTaskDependency,
	ensureTaskParentDir,
	wrapTask,
	writeTaskDiffs,
} from './ops.js'
import {
	getDefaultFilepath,
	normalizeLineEndings,
	resolveTaskFile,
} from './utils.js'

// ─── Reusable context for checkFn callbacks ───

export interface CheckFnContext {
	cwd: string
	profile: ProjectProfile
	fullPath: string | null
	content: string | null
}

// ─── Shared helpers ───

async function computeFileDiffs(
	cwd: string,
	profile: ProjectProfile,
	files: MultiFileEntry[],
): Promise<FileDiff[]> {
	const diffs: FileDiff[] = []
	for (const f of files) {
		const fullPath = resolvePath(cwd, f.filepath)
		const exists = await fileExists(fullPath)
		const before = exists ? await readFile(fullPath) : null
		const after = f.content(profile)
		if (!exists || before?.trim() !== after.trim()) {
			diffs.push({
				filepath: relative(cwd, fullPath),
				before,
				after,
			})
		}
	}
	return diffs
}

async function computeSingleFileDiff(
	cwd: string,
	profile: ProjectProfile,
	options: FileTaskOptions,
): Promise<FileDiff> {
	const fullPath = await resolveTaskFile(
		cwd,
		options.filepath,
		options.extensions,
	)
	const exists = fullPath !== null && (await fileExists(fullPath))
	const before = exists ? await readFile(fullPath) : null
	const filepath = exists
		? relative(cwd, fullPath)
		: getDefaultFilepath(options.filepath, options.extensions)
	const after = options.render(profile, before)
	return { filepath, before, after }
}

// ─── FileTask (text files with optional merge/checkFn) ───

export interface FileTaskOptions {
	id: string
	label: string
	group: string
	scope?: TaskScope
	searchMeta?: TaskSearchMeta
	applicable: (profile: ProjectProfile) => boolean
	filepath: string
	extensions?: string[]
	render: (profile: ProjectProfile, existing: string | null) => string
	merge?: boolean
	depName?: string
	depNames?: string[]
	depInstallName?: string
	installDev?: boolean
	ensureParentDir?: boolean
	checkFn?: (context: CheckFnContext) => Promise<TaskStatus>
}

export function createFileTask(options: FileTaskOptions): Task {
	return {
		id: options.id,
		label: options.label,
		group: options.group,
		searchMeta: options.searchMeta,
		scope: options.scope,
		applicable: options.applicable,

		async check(cwd, profile): Promise<TaskStatus> {
			return wrapTask(options.id, 'createFileTask.check', async () => {
				const fullPath = await resolveTaskFile(
					cwd,
					options.filepath,
					options.extensions,
				)

				if (!fullPath) return 'new' as TaskStatus

				const exists = await fileExists(fullPath)
				if (!exists) return 'new'

				if (options.checkFn) {
					const content = await readFile(fullPath)
					return options.checkFn({ cwd, profile, fullPath, content })
				}

				const pkg = await readPackageJson(cwd)
				const deps =
					options.depNames ?? (options.depName ? [options.depName] : [])
				for (const dep of deps) {
					if (!pkg?.devDependencies?.[dep] && !pkg?.dependencies?.[dep]) {
						return 'patch'
					}
				}

				const expected = options.render(profile, null)
				const actual = await readFile(fullPath)

				if (options.merge) {
					try {
						const actualJson = parseJsonc(actual) as object
						const expectedJson = JSON5.parse(expected)
						const merged = mergeJson(actualJson, expectedJson)
						if (JSON.stringify(actualJson) === JSON.stringify(merged))
							return 'skip'
						return 'patch'
					} catch {
						return 'conflict'
					}
				}

				if (
					normalizeLineEndings(actual.trim()) ===
					normalizeLineEndings(expected.trim())
				)
					return 'skip'
				return 'conflict'
			})
		},

		async dryRun(cwd, profile): Promise<FileDiff[]> {
			return wrapTask(options.id, 'createFileTask.dryRun', async () => {
				const diff = await computeSingleFileDiff(cwd, profile, options)
				return [diff]
			})
		},

		async apply(cwd, profile): Promise<void> {
			return wrapTask(options.id, 'createFileTask.apply', async () => {
				const deps =
					options.depNames ?? (options.depName ? [options.depName] : [])
				for (const dep of deps) {
					await ensureTaskDependency({
						cwd,
						depName: dep,
						depInstallName: options.depInstallName,
						installDev: options.installDev,
					})
				}

				if (options.ensureParentDir) {
					await ensureTaskParentDir(cwd, options.filepath)
				}

				const diff = await computeSingleFileDiff(cwd, profile, options)
				await writeTaskDiffs(cwd, [diff])
			})
		},
	}
}

// ─── MultiFileTask ───

export interface MultiFileEntry {
	filepath: string
	content: (profile: ProjectProfile) => string
}

export interface MultiFileTaskOptions {
	id: string
	label: string
	group: string
	scope?: TaskScope
	searchMeta?: TaskSearchMeta
	applicable: (profile: ProjectProfile) => boolean
	files: (profile: ProjectProfile) => MultiFileEntry[]
	depName?: string
	installDev?: boolean
}

export function createMultiFileTask(options: MultiFileTaskOptions): Task {
	return {
		id: options.id,
		label: options.label,
		group: options.group,
		searchMeta: options.searchMeta,
		scope: options.scope,
		applicable: options.applicable,

		async check(cwd, profile): Promise<TaskStatus> {
			return wrapTask(options.id, 'createMultiFileTask.check', async () => {
				const files = options.files(profile)
				let hasMissing = false
				let hasMismatch = false

				for (const f of files) {
					const fullPath = resolvePath(cwd, f.filepath)
					const exists = await fileExists(fullPath)
					if (!exists) {
						hasMissing = true
						continue
					}
					const expected = f.content(profile)
					const actual = await readFile(fullPath)
					if (actual.trim() !== expected.trim()) {
						hasMismatch = true
					}
				}

				if (hasMismatch) return 'conflict'
				if (hasMissing) return 'new'

				if (options.depName) {
					const pkg = await readPackageJson(cwd)
					const hasDep =
						pkg?.devDependencies?.[options.depName] ||
						pkg?.dependencies?.[options.depName]
					if (!hasDep) return 'patch'
				}

				return 'skip'
			})
		},

		async dryRun(cwd, profile): Promise<FileDiff[]> {
			return wrapTask(options.id, 'createMultiFileTask.dryRun', async () => {
				return computeFileDiffs(cwd, profile, options.files(profile))
			})
		},

		async apply(cwd, profile): Promise<void> {
			return wrapTask(options.id, 'createMultiFileTask.apply', async () => {
				await ensureTaskDependency({
					cwd,
					depName: options.depName,
					installDev: options.installDev,
				})

				const diffs = await computeFileDiffs(
					cwd,
					profile,
					options.files(profile),
				)
				await writeTaskDiffs(cwd, diffs)
			})
		},
	}
}
