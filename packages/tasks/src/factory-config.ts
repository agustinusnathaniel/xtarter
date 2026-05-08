import type { FileDiff, ProjectProfile, TaskStatus } from '@xtarterize/core'
import { fileExists, readFile, readJsonIfExists } from '@xtarterize/core'
import { mergeJson, parseJsonc, patchJson } from '@xtarterize/patchers'
import { relative } from 'pathe'
import {
	deepEqual,
	getDefaultFilepath,
	resolveTaskFile,
} from '@/factory-utils.js'

export interface JsonConfigTaskOptions {
	filepath: string
	extensions?: string[]
	incoming: (cwd: string, profile: ProjectProfile) => object | Promise<object>
	merge?: (existing: object, incoming: object) => object
}

export async function checkJsonConfigTask(
	cwd: string,
	profile: ProjectProfile,
	options: JsonConfigTaskOptions,
): Promise<TaskStatus> {
	const fullPath = await resolveTaskFile(
		cwd,
		options.filepath,
		options.extensions,
	)
	if (!fullPath) return 'new'

	const exists = await fileExists(fullPath)
	if (!exists) return 'new'

	const actual = await readJsonIfExists(fullPath)
	const incoming = await options.incoming(cwd, profile)
	const doMerge = options.merge ?? mergeJson
	const merged = doMerge(actual ?? {}, incoming)

	return deepEqual(actual, merged) ? 'skip' : 'patch'
}

export async function dryRunJsonConfigTask(
	cwd: string,
	profile: ProjectProfile,
	options: JsonConfigTaskOptions,
): Promise<FileDiff[]> {
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

	let after: string
	if (exists && before) {
		const incoming = await options.incoming(cwd, profile)
		const actual = parseJsonc(before)
		const doMerge = options.merge ?? mergeJson
		const merged = doMerge(actual ?? {}, incoming)
		after = patchJson(before, merged)
	} else {
		after = JSON.stringify(await options.incoming(cwd, profile), null, 2)
	}

	if (after === before) return []
	return [{ filepath, before, after }]
}
