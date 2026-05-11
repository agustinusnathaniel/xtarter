import consola from 'consola'
import { exec } from 'tinyexec'

export interface GitInitOptions {
	message?: string
	projectPath: string
}

export async function initializeGit({
	projectPath,
	message = 'Initial commit from create-xtarter-app',
}: GitInitOptions): Promise<void> {
	const logger = consola.withTag('git')

	logger.start('Initializing git repository...')

	try {
		// Initialize git repo
		await exec('git', ['init'], {
			nodeOptions: {
				cwd: projectPath,
				stdio: 'pipe',
			},
		})

		// Add all files
		await exec('git', ['add', '.'], {
			nodeOptions: {
				cwd: projectPath,
				stdio: 'pipe',
			},
		})

		// Create initial commit
		await exec('git', ['commit', '-m', message], {
			nodeOptions: {
				cwd: projectPath,
				stdio: 'pipe',
			},
		})

		logger.success('Git repository initialized')
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error'
		logger.warn(`Git initialization failed: ${message}`)
		throw error
	}
}

export async function isGitInstalled(): Promise<boolean> {
	try {
		const result = await exec('git', ['--version'], {
			nodeOptions: {
				stdio: 'pipe',
			},
		})
		return result.exitCode === 0
	} catch {
		return false
	}
}
