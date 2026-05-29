import { access, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { consola } from '@xtarterize/core'

export interface ModifyPackageOptions {
	projectName: string
	projectPath: string
}

async function pathExists(path: string): Promise<boolean> {
	try {
		await access(path)
		return true
	} catch {
		return false
	}
}

export async function modifyPackageJson({
	projectPath,
	projectName,
}: ModifyPackageOptions): Promise<void> {
	const logger = consola.withTag('modify')

	logger.start('Updating package.json...')

	try {
		const packageJsonPath = join(projectPath, 'package.json')
		const exists = await pathExists(packageJsonPath)

		if (!exists) {
			logger.warn('package.json not found, skipping update')
			return
		}

		const content = await readFile(packageJsonPath, 'utf-8')
		const packageJson = JSON.parse(content)

		packageJson.name = projectName
			.toLowerCase()
			.replace(/[^a-z0-9-]/g, '-')
			.replace(/-+/g, '-')
			.replace(/^-|-$/g, '')

		if (packageJson.pnpm?.overrides) {
			for (const key of Object.keys(packageJson.pnpm.overrides)) {
				const value = packageJson.pnpm.overrides[key]
				if (typeof value === 'string' && value.includes('workspace:')) {
					delete packageJson.pnpm.overrides[key]
				}
			}
		}

		await writeFile(
			packageJsonPath,
			JSON.stringify(packageJson, null, 2),
			'utf-8',
		)

		logger.success('package.json updated')
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error'
		logger.fail(`Failed to update package.json: ${message}`)
		throw error
	}
}

export interface CleanOptions {
	projectPath: string
}

export async function cleanCIConfigs({
	projectPath,
}: CleanOptions): Promise<void> {
	const logger = consola.withTag('clean')

	logger.start('Removing CI/CD configurations...')

	const filesToRemove = [
		'.github',
		'.gitlab-ci.yml',
		'.travis.yml',
		'.circleci',
		'vercel.json',
		'netlify.toml',
		'.netlify',
		'railway.toml',
		'.railway',
		'fly.toml',
		'.fly',
	]

	try {
		let removedCount = 0

		for (const file of filesToRemove) {
			const fullPath = join(projectPath, file)
			const exists = await pathExists(fullPath)

			if (exists) {
				await rm(fullPath, { recursive: true, force: true })
				removedCount++
			}
		}

		if (removedCount > 0) {
			logger.success(`Removed ${removedCount} CI/CD file(s)`)
		} else {
			logger.info('No CI/CD configs found')
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error'
		logger.fail(`Failed to clean CI/CD configs: ${message}`)
		throw error
	}
}
