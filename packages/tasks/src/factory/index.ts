import type {
	FileDiff,
	ProjectProfile,
	Task,
	TaskStatus,
} from '@xtarterize/core'
import {
	deepEqual,
	fileExists,
	findConfigFile,
	readFile,
	readPackageJson,
	resolvePath,
} from '@xtarterize/core'
import { injectVitePlugin, mergeJson, parseJsonc } from '@xtarterize/patchers'
import JSON5 from 'json5'
import { relative } from 'pathe'
import { checkJsonConfigTask, dryRunJsonConfigTask } from './json-config.js'
import {
	ensureTaskDependency,
	ensureTaskParentDir,
	writeTaskDiffs,
} from './ops.js'
import {
	getDefaultFilepath,
	normalizeExtends,
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
export {
	checkJsonConfigTask,
	dryRunJsonConfigTask,
} from './json-config.js'
export {
	ensureTaskDependency,
	ensureTaskParentDir,
	isExecutableFile,
	writeTaskDiffs,
} from './ops.js'
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

// ─── FileTask (text files with optional merge/checkFn) ───

export interface FileTaskOptions {
	id: string
	label: string
	group: string
	applicable: (profile: ProjectProfile) => boolean
	filepath: string
	extensions?: string[]
	render: (profile: ProjectProfile, existing: string | null) => string
	merge?: boolean
	depName?: string
	depInstallName?: string
	installDev?: boolean
	ensureParentDir?: boolean
	checkFn?: (
		cwd: string,
		profile: ProjectProfile,
		fullPath: string | null,
		content: string | null,
	) => Promise<TaskStatus>
}

export function createFileTask(options: FileTaskOptions): Task {
	return {
		id: options.id,
		label: options.label,
		group: options.group,
		applicable: options.applicable,

		async check(cwd, profile): Promise<TaskStatus> {
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
				return options.checkFn(cwd, profile, fullPath, content)
			}

			const expected = options.render(profile, null)
			const actual = await readFile(fullPath)

			if (options.merge) {
				const actualJson = parseJsonc(actual) as object
				const expectedJson = JSON5.parse(expected)
				const merged = mergeJson(actualJson, expectedJson)
				if (JSON.stringify(actualJson) === JSON.stringify(merged)) return 'skip'
				return 'patch'
			}

			if (actual.trim() === expected.trim()) return 'skip'
			return 'conflict'
		},

		async dryRun(cwd, profile): Promise<FileDiff[]> {
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
		},

		async apply(cwd, profile): Promise<void> {
			await ensureTaskDependency({
				cwd,
				depName: options.depName,
				depInstallName: options.depInstallName,
				installDev: options.installDev,
			})

			if (options.ensureParentDir) {
				await ensureTaskParentDir(cwd, options.filepath)
			}

			const diffs = await this.dryRun(cwd, profile)
			await writeTaskDiffs(cwd, diffs)
		},
	}
}

// ─── JsonMergeTask ───

export interface JsonMergeTaskOptions {
	id: string
	label: string
	group: string
	applicable: (profile: ProjectProfile) => boolean
	filepath: string
	extensions?: string[]
	incoming: (cwd: string, profile: ProjectProfile) => object | Promise<object>
	depName?: string
	installDev?: boolean
	checkFn?: (
		cwd: string,
		profile: ProjectProfile,
		fullPath: string | null,
		content: string | null,
	) => Promise<TaskStatus>
}

export function createJsonMergeTask(options: JsonMergeTaskOptions): Task {
	return {
		id: options.id,
		label: options.label,
		group: options.group,
		applicable: options.applicable,

		async check(cwd, profile): Promise<TaskStatus> {
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
				return options.checkFn(cwd, profile, fullPath, content)
			}

			const pkg = await readPackageJson(cwd)
			if (options.depName) {
				if (
					!pkg?.devDependencies?.[options.depName] &&
					!pkg?.dependencies?.[options.depName]
				) {
					return 'patch'
				}
			}

			return checkJsonConfigTask(cwd, profile, {
				filepath: options.filepath,
				extensions: options.extensions,
				incoming: options.incoming,
			})
		},

		async dryRun(cwd, profile): Promise<FileDiff[]> {
			return dryRunJsonConfigTask(cwd, profile, {
				filepath: options.filepath,
				extensions: options.extensions,
				incoming: options.incoming,
			})
		},

		async apply(cwd, profile): Promise<void> {
			await ensureTaskDependency({
				cwd,
				depName: options.depName,
				installDev: options.installDev,
			})

			const diffs = await this.dryRun(cwd, profile)
			await writeTaskDiffs(cwd, diffs)
		},
	}
}

// ─── SimpleFileTask (new files only, skip-if-exists) ───

export interface SimpleFileTaskOptions {
	id: string
	label: string
	group: string
	applicable: (profile: ProjectProfile) => boolean
	filepath: string
	extensions?: string[]
	render: (profile: ProjectProfile) => string
	depName?: string
	installDev?: boolean
	ensureParentDir?: boolean
	checkFn?: (
		cwd: string,
		profile: ProjectProfile,
		fullPath: string | null,
		content: string | null,
	) => Promise<TaskStatus>
}

export function createSimpleFileTask(options: SimpleFileTaskOptions): Task {
	return {
		id: options.id,
		label: options.label,
		group: options.group,
		applicable: options.applicable,

		async check(cwd, profile): Promise<TaskStatus> {
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
				return options.checkFn(cwd, profile, fullPath, content)
			}

			const expected = options.render(profile)
			const actual = await readFile(fullPath)
			if (
				normalizeLineEndings(actual.trim()) ===
				normalizeLineEndings(expected.trim())
			)
				return 'skip'
			return 'conflict'
		},

		async dryRun(cwd, profile): Promise<FileDiff[]> {
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
			const after = options.render(profile)

			return [{ filepath, before, after }]
		},

		async apply(cwd, profile): Promise<void> {
			await ensureTaskDependency({
				cwd,
				depName: options.depName,
				installDev: options.installDev,
			})

			if (options.ensureParentDir) {
				await ensureTaskParentDir(cwd, options.filepath)
			}

			const diffs = await this.dryRun(cwd, profile)
			await writeTaskDiffs(cwd, diffs)
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
		applicable: options.applicable,

		async check(cwd, profile): Promise<TaskStatus> {
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
		},

		async dryRun(cwd, profile): Promise<FileDiff[]> {
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
		},

		async apply(cwd, profile): Promise<void> {
			await ensureTaskDependency({
				cwd,
				depName: options.depName,
				installDev: options.installDev,
			})

			const diffs = await this.dryRun(cwd, profile)
			await writeTaskDiffs(cwd, diffs)
		},
	}
}

// ─── VitePluginTask ───

export interface VitePluginTaskOptions {
	id: string
	label: string
	group: string
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
		applicable: options.applicable,

		async check(cwd, _profile): Promise<TaskStatus> {
			const configPath = await findConfigFile(
				cwd,
				'vite.config',
				VITE_CONFIG_EXTENSIONS,
			)
			if (!configPath) return 'conflict'

			const content = await readFile(configPath)
			if (content.includes(options.checkString)) return 'skip'
			return 'new'
		},

		async dryRun(cwd, _profile): Promise<FileDiff[]> {
			const { generateCode, loadFile, parseExpression } = await import(
				'magicast'
			)

			const configPath = await findConfigFile(
				cwd,
				'vite.config',
				VITE_CONFIG_EXTENSIONS,
			)
			if (!configPath) return []

			const before = await readFile(configPath)
			const mod = await loadFile(configPath)

			if (mod.$code.includes(options.checkString)) {
				return [{ filepath: 'vite.config', before, after: before }]
			}

			const defaultExport = mod.exports.default
			if (!defaultExport || !Array.isArray(defaultExport.plugins)) {
				return [{ filepath: 'vite.config', before, after: before }]
			}

			const plugins: unknown[] = defaultExport.plugins as unknown[]
			plugins.push(parseExpression(options.pluginCall))

			const { code: after } = generateCode(mod)
			const importDecl =
				options.importStyle === 'named'
					? `import { ${options.importName} } from '${options.depName}'\n`
					: `import ${options.importName} from '${options.depName}'\n`
			const finalAfter = `${importDecl}${after}`

			return [{ filepath: 'vite.config', before, after: finalAfter }]
		},

		async apply(cwd, _profile): Promise<void> {
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
				throw new Error(`No vite.config file found for ${options.id}`)
			}

			const importSpecifier =
				options.importStyle === 'named'
					? `{ ${options.importName} }`
					: options.importName

			const result = await injectVitePlugin(
				configPath,
				options.depName,
				importSpecifier,
				options.pluginCall,
			)

			if (!result.success) {
				throw new Error(
					result.fallback ?? `Failed to inject ${options.depName}`,
				)
			}
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
		applicable: options.applicable,

		async check(cwd, profile): Promise<TaskStatus> {
			let status: TaskStatus = 'skip'
			for (const f of options.files) {
				const entryStatus = await checkJsonConfigTask(cwd, profile, {
					filepath: f.filepath,
					extensions: f.extensions,
					incoming: async () => f.incoming(profile),
					merge: f.merge,
				})

				if (entryStatus === 'patch') {
					status = 'patch'
					continue
				}

				if (entryStatus === 'new' && status !== 'patch') {
					status = 'new'
				}
			}
			return status
		},

		async dryRun(cwd, profile): Promise<FileDiff[]> {
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

		async apply(cwd, profile): Promise<void> {
			const diffs = await this.dryRun(cwd, profile)
			await writeTaskDiffs(cwd, diffs)
		},
	}
}
