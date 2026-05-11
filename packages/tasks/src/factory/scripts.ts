import type { ProjectProfile } from '@xtarterize/core'
import {
	hasScriptWithEquivalentValue,
	type PackageScriptsMap,
} from './equivalence.js'
import type { PackageJsonScriptEntry } from './task.js'

export interface ScriptsResolverOptions {
	scripts?: PackageJsonScriptEntry[]
	getScripts?: (
		cwd: string,
		profile: ProjectProfile,
	) => Promise<PackageJsonScriptEntry[]>
}

export async function resolveScripts(
	options: ScriptsResolverOptions,
	cwd: string,
	profile: ProjectProfile,
): Promise<PackageJsonScriptEntry[]> {
	if (options.getScripts) return options.getScripts(cwd, profile)
	return options.scripts ?? []
}

export function mergeScripts(
	current: PackageScriptsMap | undefined,
	incoming: PackageJsonScriptEntry[],
): PackageScriptsMap {
	const next = { ...current }
	for (const s of incoming) {
		if (Object.hasOwn(next, s.script)) {
			continue
		}
		if (hasScriptWithEquivalentValue(next, s.value)) {
			continue
		}
		next[s.script] = s.value
	}
	return next
}

export function filterMissingScripts(
	existing: PackageScriptsMap,
	candidates: PackageJsonScriptEntry[],
): PackageJsonScriptEntry[] {
	return candidates.filter((s) => {
		if (Object.hasOwn(existing, s.script)) {
			return false
		}
		if (hasScriptWithEquivalentValue(existing, s.value)) {
			return false
		}
		return true
	})
}
