import type {
	FileDiff,
	ProjectProfile,
	Task,
	TaskStatus,
} from '@xtarterize/core'
import {
	fileExists,
	readFile,
	readPackageJson,
	resolvePath,
	writeFile,
	writePackageJson,
} from '@xtarterize/core'
import { patchJson } from '@xtarterize/patchers'
import { addDependency } from 'nypm'

export interface PackageJsonScriptEntry {
	script: string
	value: string
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

function shouldInstallDep(
	options: PackageJsonTaskOptions,
	profile: ProjectProfile,
): boolean {
	return !!(
		options.depName &&
		(!options.depCondition || options.depCondition(profile))
	)
}

async function resolveScripts(
	options: PackageJsonTaskOptions,
	cwd: string,
	profile: ProjectProfile,
): Promise<PackageJsonScriptEntry[]> {
	if (options.getScripts) return options.getScripts(cwd, profile)
	return options.scripts ?? []
}

type PackageScriptsMap = Record<string, string | undefined>

function hasOwnScript(scripts: PackageScriptsMap, script: string): boolean {
	return Object.hasOwn(scripts, script)
}

function hasScriptValue(scripts: PackageScriptsMap, value: string): boolean {
	return Object.values(scripts).some((v) => v === value)
}

function mergePackageScripts(
	current: PackageScriptsMap | undefined,
	scripts: PackageJsonScriptEntry[],
): PackageScriptsMap {
	const next = { ...current }
	for (const s of scripts) {
		if (!hasOwnScript(next, s.script) && !hasScriptValue(next, s.value)) {
			next[s.script] = s.value
		}
	}
	return next
}

export function createPackageJsonTask(options: PackageJsonTaskOptions): Task {
	return {
		id: options.id,
		label: options.label,
		group: options.group,
		applicable: options.applicable,

		async check(cwd, profile): Promise<TaskStatus> {
			const pkg = await readPackageJson(cwd)
			if (!pkg) return 'conflict'

			if (options.checkFn) {
				return options.checkFn(cwd, profile, pkg)
			}

			const scripts = await resolveScripts(options, cwd, profile)
			const scriptsMap = pkg.scripts ?? {}
			const missingScripts = scripts.filter(
				(s) =>
					!hasOwnScript(scriptsMap, s.script) &&
					!hasScriptValue(scriptsMap, s.value),
			)

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

			if (missingScripts.length === 0 && hasDep && missingFiles.length === 0)
				return 'skip'
			if (missingScripts.length === 0 && hasDep && missingFiles.length > 0)
				return 'patch'
			if (!hasDep && missingScripts.length === 0 && missingFiles.length === 0)
				return 'patch'
			if (
				missingScripts.length === scripts.length &&
				(!needsDep || !hasDep) &&
				missingFiles.length === extraFiles.length
			)
				return 'new'
			return 'patch'
		},

		async dryRun(cwd, profile): Promise<FileDiff[]> {
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
				const pkg = await readPackageJson(cwd)
				if (pkg) {
					const scripts = await resolveScripts(options, cwd, profile)
					const scriptsMap = pkg.scripts ?? {}
					const missingScripts = scripts.filter(
						(s) =>
							!hasOwnScript(scriptsMap, s.script) &&
							!hasScriptValue(scriptsMap, s.value),
					)
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
				}
			}

			return diffs
		},

		async apply(cwd, profile): Promise<void> {
			const depName = options.depName
			if (depName && shouldInstallDep(options, profile)) {
				const pkg = await readPackageJson(cwd)
				if (!pkg?.devDependencies?.[depName] && !pkg?.dependencies?.[depName]) {
					await addDependency([depName], {
						cwd,
						dev: options.installDev ?? true,
					})
				}
			}

			for (const f of options.files ?? []) {
				const fp = resolveFilepath(f.filepath, profile)
				const fullPath = resolvePath(cwd, fp)
				const exists = await fileExists(fullPath)
				if (!exists) {
					await writeFile(fullPath, await f.render(cwd, profile))
				}
			}

			const pkg = await readPackageJson(cwd)
			if (pkg) {
				const scripts = await resolveScripts(options, cwd, profile)
				pkg.scripts = mergePackageScripts(pkg.scripts, scripts)
				await writePackageJson(cwd, pkg)
			}
		},
	}
}
