import { detectPackageManager as detectPM } from 'nypm'
import { fileExists, resolvePath } from '@/utils/fs.js'
import type { Framework, PackageManager } from './types.js'

/**
 * Type guard to check if a value is a Record
 * @param value - Value to check
 * @returns True if value is a Record<string, unknown>
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Type guard to check if a value is a Record<string, string>
 * @param value - Value to check
 * @returns True if value is a Record<string, string>
 */
export function isStringRecord(
	value: unknown,
): value is Record<string, string> {
	if (!isRecord(value)) return false
	return Object.values(value).every((v): v is string => typeof v === 'string')
}

/**
 * Detects the package manager from lockfiles or nypm
 * @param cwd - Current working directory
 * @returns Detected package manager
 */
export async function detectPackageManager(
	cwd: string,
): Promise<PackageManager> {
	const detected = await detectPM(cwd)
	if (
		detected?.name === 'npm' ||
		detected?.name === 'pnpm' ||
		detected?.name === 'yarn' ||
		detected?.name === 'bun'
	) {
		return detected.name
	}

	// Fallback to lockfile detection if nypm fails
	if (await fileExists(resolvePath(cwd, 'bun.lockb'))) return 'bun'
	if (await fileExists(resolvePath(cwd, 'bun.lock'))) return 'bun'
	if (await fileExists(resolvePath(cwd, 'pnpm-lock.yaml'))) return 'pnpm'
	if (await fileExists(resolvePath(cwd, 'yarn.lock'))) return 'yarn'
	if (await fileExists(resolvePath(cwd, 'package-lock.json'))) return 'npm'

	return 'npm'
}

/**
 * Detects framework version from package.json
 * @param pkg - Package.json content
 * @param framework - Detected framework
 * @returns Framework version string or null if not found
 */
export function detectFrameworkVersion(
	pkg: unknown,
	framework: Framework,
): string | null {
	if (!isRecord(pkg)) return null
	const allDeps: Record<string, string> = {}
	if (isStringRecord(pkg.dependencies)) {
		Object.assign(allDeps, pkg.dependencies)
	}
	if (isStringRecord(pkg.devDependencies)) {
		Object.assign(allDeps, pkg.devDependencies)
	}

	const frameworkPkg =
		framework === 'react-native'
			? (allDeps['react-native'] ?? allDeps.expo)
			: framework === 'node'
				? null
				: framework
					? allDeps[framework === 'solid' ? 'solid-js' : framework]
					: null

	if (!frameworkPkg) return null

	const cleaned = frameworkPkg.replace(/^[^0-9]*/, '')
	return cleaned || null
}
