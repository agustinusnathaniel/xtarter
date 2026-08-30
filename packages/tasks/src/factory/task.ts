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
	const cached = __pkgCache.get(cwd)
	if (cached !== undefined) return cached
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
	scope?: TaskScope
	searchMeta?: TaskSearchMeta
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

function shouldInstallDep(
	options: PackageJsonTaskOptions,
	profile: ProjectProfile,
): boolean {
	return !!(
		options.depName &&
		(!options.depCondition || options.depCondition(profile))
	)
}

function getMissingDeps(
	deps: PackageJsonTaskDep[],
	pkg: PackageJson | null,
): PackageJsonTaskDep[] {
	if (!pkg) return []
	return deps.filter(
		(dep) =>
			!pkg.devDependencies?.[dep.depName] && !pkg.dependencies?.[dep.depName],
	)
}

interface PackageJsonChanges {
	missingScripts: PackageJsonScriptEntry[]
	scripts: PackageJsonScriptEntry[]
	allDeps: PackageJsonTaskDep[]
	neededDeps: PackageJsonTaskDep[]
	missingFiles: { filepath: string; render: string }[]
	pkg: PackageJson | null
}

async function computePackageJsonChanges(
	options: PackageJsonTaskOptions,
	cwd: string,
	profile: ProjectProfile,
): Promise<PackageJsonChanges> {
	const pkg = await getPackageJson(cwd)

	const scripts = await resolveScripts(options, cwd, profile)
	const scriptsMap = pkg?.scripts ?? {}
	const missingScripts = filterMissingScripts(scriptsMap, scripts)

	const allDeps = await resolveDeps(options, cwd, profile)
	const neededDeps = filterDepsByMissingScripts(allDeps, missingScripts)

	const extraFiles = options.files ?? []
	const missingFiles: { filepath: string; render: string }[] = []
	for (const f of extraFiles) {
		const fp = resolveFilepath(f.filepath, profile)
		const fullPath = resolvePath(cwd, fp)
		const exists = await fileExists(fullPath)
		if (!exists) {
			missingFiles.push({
				filepath: fp,
				render: await f.render(cwd, profile),
			})
		}
	}

	return { missingScripts, scripts, allDeps, neededDeps, missingFiles, pkg }
}

async function getPackageJsonTaskDeps(
	cwd: string,
	profile: ProjectProfile,
	options: PackageJsonTaskOptions,
) {
	const changes = await computePackageJsonChanges(options, cwd, profile)
	return changes.neededDeps.map((d) => ({
		depName: d.depName,
		dev: d.installDev ?? true,
	}))
}

async function checkPackageJsonTask(
	cwd: string,
	profile: ProjectProfile,
	options: PackageJsonTaskOptions,
): Promise<TaskStatus> {
	const changes = await computePackageJsonChanges(options, cwd, profile)
	const { pkg, allDeps } = changes

	if (!pkg) return 'conflict'

	if (options.checkFn) {
		const status = await options.checkFn(cwd, profile, pkg)
		if (status === 'skip') {
			const missingDeps = getMissingDeps(allDeps, pkg)
			if (missingDeps.length > 0) return 'patch'
		}
		return status
	}

	return resolvePackageJsonStatus(changes, options, profile)
}

function resolvePackageJsonStatus(
	changes: PackageJsonChanges,
	options: PackageJsonTaskOptions,
	profile: ProjectProfile,
): TaskStatus {
	const { missingScripts, missingFiles } = changes
	const needsDep = shouldInstallDep(options, profile)
	const depName = options.depName
	const hasDep =
		!needsDep ||
		(depName &&
			(changes.pkg?.devDependencies?.[depName] ||
				changes.pkg?.dependencies?.[depName]))

	if (missingScripts.length === 0) {
		if (missingFiles.length > 0) return 'patch'
		return hasDep ? 'skip' : 'patch'
	}

	const extraFiles = options.files ?? []
	if (
		missingScripts.length === changes.scripts.length &&
		missingFiles.length === extraFiles.length &&
		(!needsDep || !hasDep)
	) {
		return 'new'
	}

	return 'patch'
}

async function dryRunPackageJsonTask(
	cwd: string,
	profile: ProjectProfile,
	options: PackageJsonTaskOptions,
): Promise<FileDiff[]> {
	const diffs: FileDiff[] = []
	const changes = await computePackageJsonChanges(options, cwd, profile)
	const { missingScripts, neededDeps, missingFiles, pkg } = changes

	for (const f of missingFiles) {
		diffs.push({
			filepath: f.filepath,
			before: null,
			after: f.render,
		})
	}

	await collectPackageJsonScriptDiff({ cwd, missingScripts, pkg, diffs })
	collectMissingDepsDiffs(neededDeps, pkg, diffs)

	return diffs
}

async function collectPackageJsonScriptDiff(options: {
	cwd: string
	missingScripts: PackageJsonScriptEntry[]
	pkg: PackageJson | null
	diffs: FileDiff[]
}): Promise<void> {
	const { cwd, missingScripts, pkg, diffs } = options
	const pkgPath = resolvePath(cwd, 'package.json')
	const pkgExists = await fileExists(pkgPath)
	if (pkgExists && pkg && missingScripts.length > 0) {
		const before = await readFile(pkgPath)
		const incomingScripts: Record<string, string> = {}
		for (const s of missingScripts) {
			incomingScripts[s.script] = s.value
		}
		const after = patchJson(before, { scripts: incomingScripts })
		if (after !== before) {
			diffs.push({ filepath: 'package.json', before, after })
		}
	}
}

function collectMissingDepsDiffs(
	neededDeps: PackageJsonTaskDep[],
	pkg: PackageJson | null,
	diffs: FileDiff[],
): void {
	if (!pkg) return
	const missingDeps = getMissingDeps(neededDeps, pkg)
	if (missingDeps.length === 0) return
	const devDeps = missingDeps.filter((dep) => dep.installDev ?? true)
	const prodDeps = missingDeps.filter((dep) => !(dep.installDev ?? true))
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

async function applyPackageJsonTask(
	cwd: string,
	profile: ProjectProfile,
	options: PackageJsonTaskOptions,
): Promise<void> {
	const changes = await computePackageJsonChanges(options, cwd, profile)
	const { missingScripts, neededDeps, missingFiles, pkg } = changes

	for (const f of missingFiles) {
		const fullPath = resolvePath(cwd, f.filepath)
		await writeFile(fullPath, f.render)
	}

	if (pkg && missingScripts.length > 0) {
		pkg.scripts = mergeScripts(pkg.scripts, missingScripts)
		await writePackageJson(cwd, pkg)
		invalidatePackageJsonCache(cwd)
	}

	if (neededDeps.length > 0) {
		const deps = neededDeps.map((d) => ({
			depName: d.depName,
			dev: d.installDev ?? true,
		}))
		await installDependenciesBatch(cwd, deps)
	}
}

export function createPackageJsonTask(options: PackageJsonTaskOptions): Task {
	return {
		id: options.id,
		label: options.label,
		group: options.group,
		searchMeta: options.searchMeta,
		scope: options.scope,
		applicable: options.applicable,
		async getDeps(cwd, profile) {
			return getPackageJsonTaskDeps(cwd, profile, options)
		},
		async check(cwd, profile): Promise<TaskStatus> {
			return wrapTask(options.id, 'createPackageJsonTask.check', () =>
				checkPackageJsonTask(cwd, profile, options),
			)
		},
		async dryRun(cwd, profile): Promise<FileDiff[]> {
			return wrapTask(options.id, 'createPackageJsonTask.dryRun', () =>
				dryRunPackageJsonTask(cwd, profile, options),
			)
		},
		async apply(cwd, profile): Promise<void> {
			return wrapTask(options.id, 'createPackageJsonTask.apply', () =>
				applyPackageJsonTask(cwd, profile, options),
			)
		},
	}
}
