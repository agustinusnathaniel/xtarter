import { hasScriptWithEquivalentValue } from './equivalence.js'
import type { PackageJsonScriptEntry } from './task.js'

type PackageScriptsMap = Record<string, string | undefined>

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
