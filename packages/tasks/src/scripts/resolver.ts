import type { ProjectProfile } from '@xtarterize/core'
import type { PackageJsonScriptEntry } from './task.js'

export interface ResolverOptions {
	scripts?: PackageJsonScriptEntry[]
	getScripts?: (
		cwd: string,
		profile: ProjectProfile,
	) => Promise<PackageJsonScriptEntry[]>
}

export async function resolveScripts(
	options: ResolverOptions,
	cwd: string,
	profile: ProjectProfile,
): Promise<PackageJsonScriptEntry[]> {
	if (options.getScripts) return options.getScripts(cwd, profile)
	return options.scripts ?? []
}
