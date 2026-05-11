import consola from 'consola'
import { exec } from 'tinyexec'
import type { PackageManager } from '@/types'

export interface InstallOptions {
	packageManager: PackageManager
	projectPath: string
}

export async function installDependencies({
	packageManager,
	projectPath,
}: InstallOptions): Promise<void> {
	const logger = consola.withTag('install')

	logger.start(`Installing dependencies with ${packageManager}...`)

	try {
		const result = await exec(packageManager, ['install'], {
			nodeOptions: {
				cwd: projectPath,
				stdio: 'inherit',
			},
		})

		if (result.exitCode !== 0) {
			throw new Error(
				`${packageManager} install failed with exit code ${result.exitCode}`,
			)
		}

		logger.success('Dependencies installed successfully')
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error'
		logger.fail(`Failed to install dependencies: ${message}`)
		throw error
	}
}

export function getInstallCommand(packageManager: PackageManager): string {
	return `${packageManager} install`
}

export function getDevCommand(packageManager: PackageManager): string {
	return `${packageManager} dev`
}
