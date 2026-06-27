import type {
	FileDiff,
	ProjectProfile,
	Task,
	TaskStatus,
} from '@xtarterize/core'
import {
	fileExists,
	installDependency,
	readFile,
	readPackageJson,
	resolvePath,
	writeFile,
	writePackageJson,
} from '@xtarterize/core'
import { patchJson } from '@xtarterize/patchers'
import type { PackageJson } from 'pkg-types'
import { wrapTask } from './ops.js'
import {
	filterMissingScripts,
	mergeScripts,
	resolveScripts,
} from './scripts.js'

const __pkgCache = new Map<string, PackageJson | null>()

async function getPackageJson(cwd: string): Promise<PackageJson | null> {
	if (__pkgCache.has(cwd)) return __pkgCache.get(cwd)!
	const pkg = await readPackageJson(cwd)
	__pkgCache.set(cwd, pkg)
	return pkg
}

function invalidatePackageJsonCache(cwd: string): void {
	__pkgCache.delete(cwd)
}

export interface PackageJsonScriptEntry {
	script: string
	value: string
}

export interface PackageJsonTaskDep {
	depName: string
	installDev?: boolean
	script?: string
}

export interface PackageJsonTaskOptions {
	id: string
	label: string
	group: string
	applicable: (profile: ProjectProfile) => boolean
	scripts?: PackageJsonScriptEntry[]
	getScripts?: (
		cwd: string,
		profile: ProjectProfile,
	) => Promise<PackageJsonScriptEntry[]>
	depName?: string
	depCondition?: (profile: ProjectProfile) => boolean
	installDev?: boolean
	deps?: PackageJsonTaskDep[]
	getDeps?: (
		cwd: string,
		profile: ProjectProfile,
	) => Promise<PackageJsonTaskDep[]>
	files?: {
		filepath: string | ((profile: ProjectProfile) => string)
		render: (cwd: string, profile: ProjectProfile) => Promise<string> | string
	}[]
	checkFn?: (
		cwd: string,
		profile: ProjectProfile,
		pkg: Record<string, unknown>,
	) => Promise<TaskStatus>
}

function resolveFilepath(
	filepath: string | ((profile: ProjectProfile) => string),
	profile: ProjectProfile,
): string {
	return typeof filepath === 'function' ? filepath(profile) : filepath
}

async function resolveDeps(
	options: PackageJsonTaskOptions,
	cwd: string,
	profile: ProjectProfile,
): Promise<PackageJsonTaskDep[]> {
	if (options.getDeps) {
		return options.getDeps(cwd, profile)
	}
	if (options.deps) {
		return options.deps
	}
	if (options.depName) {
		return [{ depName: options.depName, installDev: options.installDev }]
	}
	return []
}

function filterDepsByMissingScripts(
	deps: PackageJsonTaskDep[],
	missingScripts: PackageJsonScriptEntry[],
): PackageJsonTaskDep[] {
	const missingScriptNames = new Set(missingScripts.map((s) => s.script))
	return deps.filter((dep) => !dep.script || missingScriptNames.has(dep.script))
}

async function getMissingDeps(
	options: PackageJsonTaskOptions,
	cwd: string,
	profile: ProjectProfile,
): Promise<PackageJsonTaskDep[]> {
	const pkg = await getPackageJson(cwd)
	if (!pkg) return []
	const allDeps = await resolveDeps(options, cwd, profile)
	return allDeps.filter(
		(dep) =>
			!pkg.devDependencies?.[dep.depName] && !pkg.dependencies?.[dep.depName],
	)
}

function shouldInstallDep(
	options: PackageJsonTaskOptions,
	profile: ProjectProfile,
): boolean {
	return !!(
		options.depName &&
		(!options.depCondition || options.depCondition(profile))
	)
}

export function createPackageJsonTask(options: PackageJsonTaskOptions): Task {
	return {
		id: options.id,
		label: options.label,
		group: options.group,
		applicable: options.applicable,

		async check(cwd, profile): Promise<TaskStatus> {
			return wrapTask(options.id, 'createPackageJsonTask.check', async () => {
				const pkg = await getPackageJson(cwd)
				if (!pkg) return 'conflict'

				if (options.checkFn) {
					const status = await options.checkFn(cwd, profile, pkg)
					if (status === 'skip') {
						const missing = await getMissingDeps(options, cwd, profile)
						if (missing.length > 0) return 'patch'
					}
					return status
				}

				const scripts = await resolveScripts(options, cwd, profile)
				const scriptsMap = pkg.scripts ?? {}
				const missingScripts = filterMissingScripts(scriptsMap, scripts)

				const needsDep = shouldInstallDep(options, profile)
				const depName = options.depName
				const hasDep =
					!needsDep ||
					(depName &&
						(pkg.devDependencies?.[depName] || pkg.dependencies?.[depName]))

				const extraFiles = options.files ?? []
				const missingFiles: string[] = []
				for (const f of extraFiles) {
					const fp = resolveFilepath(f.filepath, profile)
					const fullPath = resolvePath(cwd, fp)
					const exists = await fileExists(fullPath)
					if (!exists) missingFiles.push(fp)
				}

				if (missingScripts.length === 0) {
					if (missingFiles.length > 0) {
						return 'patch'
					}
					return hasDep ? 'skip' : 'patch'
				}

				if (
					missingScripts.length === scripts.length &&
					missingFiles.length === extraFiles.length &&
					(!needsDep || !hasDep)
				) {
					return 'new'
				}

				return 'patch'
			})
		},

		async dryRun(cwd, profile): Promise<FileDiff[]> {
			return wrapTask(options.id, 'createPackageJsonTask.dryRun', async () => {
				const diffs: FileDiff[] = []

				for (const f of options.files ?? []) {
					const fp = resolveFilepath(f.filepath, profile)
					const fullPath = resolvePath(cwd, fp)
					const exists = await fileExists(fullPath)
					if (exists) continue
					diffs.push({
						filepath: fp,
						before: null,
						after: await f.render(cwd, profile),
					})
				}

				const pkgPath = resolvePath(cwd, 'package.json')
				const pkgExists = await fileExists(pkgPath)
				if (pkgExists) {
					const before = await readFile(pkgPath)
					const pkg = await getPackageJson(cwd)
					if (pkg) {
						const scripts = await resolveScripts(options, cwd, profile)
						const scriptsMap = pkg.scripts ?? {}
						const missingScripts = filterMissingScripts(scriptsMap, scripts)
						if (missingScripts.length > 0) {
							const incomingScripts: Record<string, string> = {}
							for (const s of missingScripts) {
								incomingScripts[s.script] = s.value
							}
							const after = patchJson(before, { scripts: incomingScripts })
							if (after !== before) {
								diffs.push({ filepath: 'package.json', before, after })
							}
						}

						const allDeps = await resolveDeps(options, cwd, profile)
						const neededDeps = filterDepsByMissingScripts(
							allDeps,
							missingScripts,
						)
						const missingDeps = neededDeps.filter(
							(dep) =>
								!pkg.devDependencies?.[dep.depName] &&
								!pkg.dependencies?.[dep.depName],
						)
						if (missingDeps.length > 0) {
							const devDeps = missingDeps.filter(
								(dep) => dep.installDev ?? true,
							)
							const prodDeps = missingDeps.filter(
								(dep) => !(dep.installDev ?? true),
							)
							if (devDeps.length > 0) {
								diffs.push({
									filepath: `devDependencies (${devDeps.map((d) => d.depName).join(', ')})`,
									before: null,
									after: devDeps.map((d) => d.depName).join('\n'),
								})
							}
							if (prodDeps.length > 0) {
								diffs.push({
									filepath: `dependencies (${prodDeps.map((d) => d.depName).join(', ')})`,
									before: null,
									after: prodDeps.map((d) => d.depName).join('\n'),
								})
							}
						}
					}
				}

				return diffs
			})
		},

		async apply(cwd, profile): Promise<void> {
			return wrapTask(options.id, 'createPackageJsonTask.apply', async () => {
				const scripts = await resolveScripts(options, cwd, profile)
				const rawExisting = (await getPackageJson(cwd))?.scripts ?? {}
				const existingScripts: Record<string, string> = {}
				for (const [key, value] of Object.entries(rawExisting)) {
					if (value !== undefined) {
						existingScripts[key] = value
					}
				}
				const missingScripts = filterMissingScripts(existingScripts, scripts)

				const allDeps = await resolveDeps(options, cwd, profile)
				const neededDeps = filterDepsByMissingScripts(allDeps, missingScripts)

				for (const dep of neededDeps) {
					await installDependency(cwd, dep.depName, dep.installDev ?? true)
					invalidatePackageJsonCache(cwd)
				}

				for (const f of options.files ?? []) {
					const fp = resolveFilepath(f.filepath, profile)
					const fullPath = resolvePath(cwd, fp)
					const exists = await fileExists(fullPath)
					if (!exists) {
						await writeFile(fullPath, await f.render(cwd, profile))
					}
				}

				const pkg = await getPackageJson(cwd)
				if (pkg) {
					if (missingScripts.length > 0) {
						const incomingScripts: Record<string, string> = {}
						for (const s of missingScripts) {
							incomingScripts[s.script] = s.value
						}
						pkg.scripts = mergeScripts(pkg.scripts, missingScripts)
						await writePackageJson(cwd, pkg)
						invalidatePackageJsonCache(cwd)
					}
				}
			})
		},
	}
}
