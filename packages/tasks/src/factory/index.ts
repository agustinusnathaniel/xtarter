import type {
	FileDiff,
	ProjectProfile,
	Task,
	TaskScope,
	TaskSearchMeta,
	TaskStatus,
} from '@xtarterize/core'
import {
	deepEqual,
	fileExists,
	findConfigFile,
	readFile,
	readPackageJson,
	resolvePath,
	TaskError,
} from '@xtarterize/core'
import { injectVitePlugin, mergeJson, parseJsonc } from '@xtarterize/patchers'
import JSON5 from 'json5'
import { relative } from 'pathe'
import { checkJsonConfigTask, dryRunJsonConfigTask } from './json-config.js'
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

export {
	areEquivalent,
	extractTool,
	findEquivalentScriptKey,
	hasScriptWithEquivalentValue,
	normalizeCommand,
	type PackageScriptsMap,
} from './equivalence.js'
export type { JsonConfigTaskOptions } from './json-config.js'
export { checkJsonConfigTask, dryRunJsonConfigTask } from './json-config.js'
export {
	ensureTaskDependency,
	ensureTaskParentDir,
	isExecutableFile,
	wrapTask,
	writeTaskDiffs,
} from './ops.js'
export { lintToolScripts, resolveLintTool } from './package-scripts.js'
export type { PackageJsonScriptEntry, PackageJsonTaskOptions } from './task.js'
export { createPackageJsonTask } from './task.js'
// ─── Re-exports from sub-modules ───
export {
	getDefaultFilepath,
	normalizeExtends,
	normalizeLineEndings,
	resolveTaskFile,
} from './utils.js'
// ─── Re-exports from core (convenience) ───
export { deepEqual }

// ─── Reusable context for checkFn callbacks ───

export interface CheckFnContext {
	cwd: string
	profile: ProjectProfile
	fullPath: string | null
	content: string | null
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

				return [{ filepath, before, after }]
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

				await writeTaskDiffs(cwd, [{ filepath, before, after }])
			})
		},
	}
}

// ─── JsonMergeTask ───

export interface JsonMergeTaskOptions {
	id: string
	label: string
	group: string
	scope?: TaskScope
	searchMeta?: TaskSearchMeta
	applicable: (profile: ProjectProfile) => boolean
	filepath: string
	extensions?: string[]
	incoming: (cwd: string, profile: ProjectProfile) => object | Promise<object>
	depName?: string
	depNames?: string[]
	installDev?: boolean
	checkFn?: (context: CheckFnContext) => Promise<TaskStatus>
}

export function createJsonMergeTask(options: JsonMergeTaskOptions): Task {
	return {
		id: options.id,
		label: options.label,
		group: options.group,
		searchMeta: options.searchMeta,
		scope: options.scope,
		applicable: options.applicable,

		async check(cwd, profile): Promise<TaskStatus> {
			return wrapTask(options.id, 'createJsonMergeTask.check', async () => {
				const fullPath = await resolveTaskFile(
					cwd,
					options.filepath,
					options.extensions,
				)

				if (!fullPath) return 'new'

				const exists = await fileExists(fullPath)
				if (!exists) return 'new'

				if (options.checkFn) {
					const content = await readFile(fullPath)
					return options.checkFn({ cwd, profile, fullPath, content })
				}

				const pkg = await readPackageJson(cwd)
				const depNames =
					options.depNames ?? (options.depName ? [options.depName] : [])
				for (const dep of depNames) {
					if (!pkg?.devDependencies?.[dep] && !pkg?.dependencies?.[dep]) {
						return 'patch'
					}
				}

				return checkJsonConfigTask(cwd, profile, {
					filepath: options.filepath,
					extensions: options.extensions,
					incoming: options.incoming,
				})
			})
		},

		async dryRun(cwd, profile): Promise<FileDiff[]> {
			return wrapTask(options.id, 'createJsonMergeTask.dryRun', () =>
				dryRunJsonConfigTask(cwd, profile, {
					filepath: options.filepath,
					extensions: options.extensions,
					incoming: options.incoming,
				}),
			)
		},

		async apply(cwd, profile): Promise<void> {
			return wrapTask(options.id, 'createJsonMergeTask.apply', async () => {
				const deps =
					options.depNames ?? (options.depName ? [options.depName] : [])
				for (const dep of deps) {
					await ensureTaskDependency({
						cwd,
						depName: dep,
						installDev: options.installDev,
					})
				}

				const diffs = await this.dryRun(cwd, profile)
				await writeTaskDiffs(cwd, diffs)
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
				const files = options.files(profile)
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
			})
		},

		async apply(cwd, profile): Promise<void> {
			return wrapTask(options.id, 'createMultiFileTask.apply', async () => {
				await ensureTaskDependency({
					cwd,
					depName: options.depName,
					installDev: options.installDev,
				})

				const files = options.files(profile)
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

				await writeTaskDiffs(cwd, diffs)
			})
		},
	}
}

// ─── VitePluginTask ───

export interface VitePluginTaskOptions {
	id: string
	label: string
	group: string
	scope?: TaskScope
	searchMeta?: TaskSearchMeta
	applicable: (profile: ProjectProfile) => boolean
	depName: string
	importName: string
	importStyle: 'default' | 'named'
	pluginCall: string
	checkString: string
}

const VITE_CONFIG_EXTENSIONS = ['.ts', '.js', '.mts', '.mjs', '.cjs', '.cts']

export function createVitePluginTask(options: VitePluginTaskOptions): Task {
	return {
		id: options.id,
		label: options.label,
		group: options.group,
		searchMeta: options.searchMeta,
		scope: options.scope,
		applicable: options.applicable,

		async check(cwd, _profile): Promise<TaskStatus> {
			return wrapTask(options.id, 'createVitePluginTask.check', async () => {
				const configPath = await findConfigFile(
					cwd,
					'vite.config',
					VITE_CONFIG_EXTENSIONS,
				)
				if (!configPath) return 'new'

				const content = await readFile(configPath)
				if (content.includes(options.checkString)) return 'skip'
				return 'new'
			})
		},

		async dryRun(cwd, _profile): Promise<FileDiff[]> {
			return wrapTask(options.id, 'createVitePluginTask.dryRun', async () => {
				const configPath = await findConfigFile(
					cwd,
					'vite.config',
					VITE_CONFIG_EXTENSIONS,
				)
				if (!configPath) return []

				const importSpecifier =
					options.importStyle === 'named'
						? `{ ${options.importName} }`
						: options.importName

				const result = await injectVitePlugin({
					configPath,
					importPath: options.depName,
					importName: importSpecifier,
					pluginExpression: options.pluginCall,
					dryRun: true,
				})

				if (!result.success) {
					return []
				}

				return [
					{
						filepath: 'vite.config',
						before: result.beforeCode ?? null,
						after: result.generatedCode ?? result.beforeCode ?? '',
					},
				]
			})
		},

		async apply(cwd, _profile): Promise<void> {
			return wrapTask(options.id, 'createVitePluginTask.apply', async () => {
				await ensureTaskDependency({
					cwd,
					depName: options.depName,
					installDev: true,
				})

				const configPath = await findConfigFile(
					cwd,
					'vite.config',
					VITE_CONFIG_EXTENSIONS,
				)
				if (!configPath) {
					throw new TaskError({
						taskId: options.id,
						message: `No vite.config file found for ${options.id}`,
					})
				}

				const importSpecifier =
					options.importStyle === 'named'
						? `{ ${options.importName} }`
						: options.importName

				const result = await injectVitePlugin({
					configPath,
					importPath: options.depName,
					importName: importSpecifier,
					pluginExpression: options.pluginCall,
				})

				if (!result.success) {
					throw new TaskError({
						taskId: options.id,
						message: result.fallback ?? `Failed to inject ${options.depName}`,
					})
				}
			})
		},
	}
}

// ─── MultiFileJsonMergeTask ───

export interface MultiFileJsonMergeEntry {
	filepath: string
	extensions?: string[]
	incoming: (profile: ProjectProfile) => object | Promise<object>
	merge?: (existing: object, incoming: object) => object
}

export interface MultiFileJsonMergeTaskOptions {
	id: string
	label: string
	group: string
	scope?: TaskScope
	searchMeta?: TaskSearchMeta
	applicable: (profile: ProjectProfile) => boolean
	files: MultiFileJsonMergeEntry[]
}

export function createMultiFileJsonMergeTask(
	options: MultiFileJsonMergeTaskOptions,
): Task {
	return {
		id: options.id,
		label: options.label,
		group: options.group,
		searchMeta: options.searchMeta,
		scope: options.scope,
		applicable: options.applicable,

		async check(cwd, profile): Promise<TaskStatus> {
			return wrapTask(
				options.id,
				'createMultiFileJsonMergeTask.check',
				async () => {
					let status: TaskStatus = 'skip'
					for (const f of options.files) {
						const entryStatus = await checkJsonConfigTask(cwd, profile, {
							filepath: f.filepath,
							extensions: f.extensions,
							incoming: async () => f.incoming(profile),
							merge: f.merge,
						})

						if (entryStatus === 'conflict') {
							status = 'conflict'
							continue
						}

						if (entryStatus === 'patch') {
							status = 'patch'
							continue
						}

						if (
							entryStatus === 'new' &&
							status !== 'patch' &&
							status !== 'conflict'
						) {
							status = 'new'
						}
					}
					return status
				},
			)
		},

		async dryRun(cwd, profile): Promise<FileDiff[]> {
			return wrapTask(
				options.id,
				'createMultiFileJsonMergeTask.dryRun',
				async () => {
					const diffs: FileDiff[] = []
					for (const f of options.files) {
						const entryDiffs = await dryRunJsonConfigTask(cwd, profile, {
							filepath: f.filepath,
							extensions: f.extensions,
							incoming: async () => f.incoming(profile),
							merge: f.merge,
						})
						diffs.push(...entryDiffs)
					}
					return diffs
				},
			)
		},

		async apply(cwd, profile): Promise<void> {
			return wrapTask(
				options.id,
				'createMultiFileJsonMergeTask.apply',
				async () => {
					const diffs = await this.dryRun(cwd, profile)
					await writeTaskDiffs(cwd, diffs)
				},
			)
		},
	}
}
