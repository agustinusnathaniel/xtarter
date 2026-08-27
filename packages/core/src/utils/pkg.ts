import { addDependency } from 'nypm'
import { type PackageJson, readPackageJSON, writePackageJSON } from 'pkg-types'
import { detectPackageManager } from '@/detect/package-manager.js'
import { fileExists, resolvePath } from '@/utils/fs.js'

export async function isPnpmWorkspace(
	cwd: string,
): Promise<boolean | undefined> {
	const exists = await fileExists(resolvePath(cwd, 'pnpm-workspace.yaml'))
	return exists || undefined
}

export async function readPackageJson(cwd: string) {
	const pkgPath = resolvePath(cwd, 'package.json')
	const exists = await fileExists(pkgPath)
	if (!exists) return null
	return readPackageJSON(pkgPath)
}

export async function writePackageJson(
	cwd: string,
	pkg: PackageJson,
): Promise<void> {
	await writePackageJSON(resolvePath(cwd, 'package.json'), pkg)
}

export function hasDependency(
	pkg: {
		dependencies?: Record<string, string>
		devDependencies?: Record<string, string>
	},
	name: string,
): boolean {
	return !!(pkg.dependencies?.[name] || pkg.devDependencies?.[name])
}

export function getDependencyVersion(
	pkg: {
		dependencies?: Record<string, string>
		devDependencies?: Record<string, string>
	},
	name: string,
): string | undefined {
	return pkg.dependencies?.[name] ?? pkg.devDependencies?.[name]
}

export function getNodeVersion(pkg: {
	engines?: Record<string, string>
}): string {
	if (pkg.engines?.node) return pkg.engines.node
	return '22'
}

/**
 * Install a dependency via the project's package manager.
 *
 * Skips installation if the dependency already exists in package.json.
 * Throws if the `nypm` addDependency call fails (network error, resolution
 * failure, permissions, etc.).
 *
 * @throws {Error} With a message including the dependency name and underlying error.
 */
export interface DepToInstall {
	depName: string
	dev: boolean
}

/**
 * Install multiple dependencies in batches.
 *
 * Groups dependencies by dev/prod and installs each group in a single
 * `nypm addDependency` call, reducing the number of spawned package
 * manager subprocesses.
 *
 * Skips dependencies already present in package.json.
 */
export async function installDependenciesBatch(
	cwd: string,
	deps: DepToInstall[],
	options?: { silent?: boolean },
): Promise<void> {
	if (deps.length === 0) return

	// Filter out already-installed deps
	const pkg = await readPackageJson(cwd)
	const missing = deps.filter(
		(d) =>
			!pkg?.devDependencies?.[d.depName] && !pkg?.dependencies?.[d.depName],
	)
	if (missing.length === 0) return

	const workspace = await isPnpmWorkspace(cwd)

	// Group by dev vs prod (nypm's `dev` option applies to ALL names in one call)
	const devDeps = missing.filter((d) => d.dev).map((d) => d.depName)
	const prodDeps = missing.filter((d) => !d.dev).map((d) => d.depName)

	const errors: string[] = []

	const packageManager = await detectPackageManager(cwd)

	if (devDeps.length > 0) {
		try {
			await addDependency(devDeps, {
				cwd,
				dev: true,
				workspace,
				silent: options?.silent,
				packageManager,
			})
		} catch (cause) {
			const msg = cause instanceof Error ? cause.message : String(cause)
			errors.push(`Failed to install dev dependencies: ${msg}`)
		}
	}

	if (prodDeps.length > 0) {
		try {
			await addDependency(prodDeps, {
				cwd,
				dev: false,
				workspace,
				silent: options?.silent,
				packageManager,
			})
		} catch (cause) {
			const msg = cause instanceof Error ? cause.message : String(cause)
			errors.push(`Failed to install dependencies: ${msg}`)
		}
	}

	if (errors.length > 0) {
		throw new Error(errors.join('\n'))
	}
}

export async function installDependency(
	cwd: string,
	depName: string,
	dev: boolean = true,
): Promise<void> {
	const pkg = await readPackageJson(cwd)
	if (pkg?.devDependencies?.[depName] || pkg?.dependencies?.[depName]) return

	const workspace = await isPnpmWorkspace(cwd)

	const packageManager = await detectPackageManager(cwd)

	try {
		await addDependency([depName], {
			cwd,
			dev,
			workspace,
			packageManager,
		})
	} catch (cause) {
		const message = cause instanceof Error ? cause.message : String(cause)
		throw new Error(`Failed to install dependency '${depName}': ${message}`)
	}
}
