import { addDependency } from 'nypm'
import { type PackageJson, readPackageJSON, writePackageJSON } from 'pkg-types'
import { fileExists, resolvePath } from '@/utils/fs.js'
import { logWarn } from '@/utils/logger.js'

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
	return '20'
}

export async function installDependency(
	cwd: string,
	depName: string,
	dev: boolean = true,
): Promise<void> {
	const pkg = await readPackageJson(cwd)
	if (pkg?.devDependencies?.[depName] || pkg?.dependencies?.[depName]) return

	const isPnpmWorkspaceRoot = await fileExists(
		resolvePath(cwd, 'pnpm-workspace.yaml'),
	)

	try {
		await addDependency([depName], {
			cwd,
			dev,
			workspace: isPnpmWorkspaceRoot || undefined,
		})
	} catch {
		logWarn(`Failed to install ${depName}, continuing without it`)
	}
}
