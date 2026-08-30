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
	installDependenciesBatch,
	readFile,
} from '@xtarterize/core'
import type { CheckFnContext } from './file-task.js'
import { checkJsonConfigTask, dryRunJsonConfigTask } from './json-config.js'
import { checkMissingDeps, wrapTask, writeTaskDiffs } from './ops.js'
import { resolveTaskFile } from './utils.js'

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
	depInstallName?: string
	checkFn?: (context: CheckFnContext) => Promise<TaskStatus>
}

function getJsonMergeTaskDeps(options: JsonMergeTaskOptions) {
	const deps = options.depNames ?? (options.depName ? [options.depName] : [])
	return deps.map((dep) => ({
		depName: options.depInstallName ?? dep,
		dev: options.installDev ?? true,
	}))
}

async function checkJsonMergeTask(
	cwd: string,
	profile: ProjectProfile,
	options: JsonMergeTaskOptions,
): Promise<TaskStatus> {
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
	const missingDep = await checkMissingDeps(cwd, {
		depName: options.depName,
		depNames: options.depNames,
	})
	if (missingDep) return missingDep
	return checkJsonConfigTask(cwd, profile, {
		filepath: options.filepath,
		extensions: options.extensions,
		incoming: options.incoming,
	})
}

function dryRunJsonMergeTask(
	cwd: string,
	profile: ProjectProfile,
	options: JsonMergeTaskOptions,
): Promise<FileDiff[]> {
	return dryRunJsonConfigTask(cwd, profile, {
		filepath: options.filepath,
		extensions: options.extensions,
		incoming: options.incoming,
	})
}

async function applyJsonMergeTask(
	cwd: string,
	profile: ProjectProfile,
	options: JsonMergeTaskOptions,
): Promise<void> {
	const diffs = await dryRunJsonMergeTask(cwd, profile, options)
	await writeTaskDiffs(cwd, diffs)
	const deps = options.depNames ?? (options.depName ? [options.depName] : [])
	if (deps.length > 0) {
		await installDependenciesBatch(
			cwd,
			deps.map((dep) => ({
				depName: options.depInstallName ?? dep,
				dev: options.installDev ?? true,
			})),
		)
	}
}

export function createJsonMergeTask(options: JsonMergeTaskOptions): Task {
	return {
		id: options.id,
		label: options.label,
		group: options.group,
		searchMeta: options.searchMeta,
		scope: options.scope,
		applicable: options.applicable,
		async getDeps(_cwd, _profile) {
			return getJsonMergeTaskDeps(options)
		},
		async check(cwd, profile): Promise<TaskStatus> {
			return wrapTask(options.id, 'createJsonMergeTask.check', () =>
				checkJsonMergeTask(cwd, profile, options),
			)
		},
		async dryRun(cwd, profile): Promise<FileDiff[]> {
			return wrapTask(options.id, 'createJsonMergeTask.dryRun', () =>
				dryRunJsonMergeTask(cwd, profile, options),
			)
		},
		async apply(cwd, profile): Promise<void> {
			return wrapTask(options.id, 'createJsonMergeTask.apply', () =>
				applyJsonMergeTask(cwd, profile, options),
			)
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

async function checkMultiFileJsonMergeTask(
	cwd: string,
	profile: ProjectProfile,
	options: MultiFileJsonMergeTaskOptions,
): Promise<TaskStatus> {
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
		if (entryStatus === 'new' && status !== 'patch' && status !== 'conflict') {
			status = 'new'
		}
	}
	return status
}

async function dryRunMultiFileJsonMergeTask(
	cwd: string,
	profile: ProjectProfile,
	options: MultiFileJsonMergeTaskOptions,
): Promise<FileDiff[]> {
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
}

async function applyMultiFileJsonMergeTask(
	cwd: string,
	profile: ProjectProfile,
	options: MultiFileJsonMergeTaskOptions,
): Promise<void> {
	const diffs = await dryRunMultiFileJsonMergeTask(cwd, profile, options)
	await writeTaskDiffs(cwd, diffs)
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
			return wrapTask(options.id, 'createMultiFileJsonMergeTask.check', () =>
				checkMultiFileJsonMergeTask(cwd, profile, options),
			)
		},
		async dryRun(cwd, profile): Promise<FileDiff[]> {
			return wrapTask(options.id, 'createMultiFileJsonMergeTask.dryRun', () =>
				dryRunMultiFileJsonMergeTask(cwd, profile, options),
			)
		},
		async apply(cwd, profile): Promise<void> {
			return wrapTask(options.id, 'createMultiFileJsonMergeTask.apply', () =>
				applyMultiFileJsonMergeTask(cwd, profile, options),
			)
		},
	}
}
