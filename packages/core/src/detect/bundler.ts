import { findConfigFile } from '@/utils/fs.js'
import type { Bundler } from './types.js'

/**
 * Checks if a bundler config file exists
 * @param cwd - Current working directory
 * @param baseName - Base name of config file (e.g., 'vite.config')
 * @param extensions - Array of file extensions to check
 * @returns Promise resolving to true if config file exists
 */
export async function hasBundlerConfig(
	cwd: string,
	baseName: string,
	extensions: string[],
): Promise<boolean> {
	return Boolean(await findConfigFile(cwd, baseName, extensions))
}

/**
 * Detects the bundler from dependencies and config files
 * @param deps - Record of package names to versions
 * @param cwd - Current working directory
 * @returns Detected bundler
 */
export async function detectBundler(
	deps: Record<string, string>,
	cwd: string,
): Promise<Bundler> {
	if (deps['@tanstack/start']) return 'tanstack-start'
	if (deps.next) return 'nextjs'
	if (deps.expo) return 'expo'
	if (deps.vite) return 'vite'
	if (deps.webpack) return 'webpack'
	if (deps['@rspack/core']) return 'rspack'
	if (
		await hasBundlerConfig(cwd, 'next.config', [
			'.ts',
			'.js',
			'.mts',
			'.mjs',
			'.cts',
			'.cjs',
		])
	)
		return 'nextjs'
	if (
		await hasBundlerConfig(cwd, 'vite.config', [
			'.ts',
			'.js',
			'.mts',
			'.mjs',
			'.cts',
			'.cjs',
		])
	)
		return 'vite'
	if (
		(await hasBundlerConfig(cwd, 'webpack.config', [
			'.ts',
			'.js',
			'.mts',
			'.mjs',
			'.cts',
			'.cjs',
		])) ||
		(await hasBundlerConfig(cwd, 'rspack.config', [
			'.ts',
			'.js',
			'.mts',
			'.mjs',
			'.cts',
			'.cjs',
		]))
	) {
		return (await hasBundlerConfig(cwd, 'rspack.config', [
			'.ts',
			'.js',
			'.mts',
			'.mjs',
			'.cts',
			'.cjs',
		]))
			? 'rspack'
			: 'webpack'
	}
	return 'none'
}
