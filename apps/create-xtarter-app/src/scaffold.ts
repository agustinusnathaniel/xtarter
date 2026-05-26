import { existsSync } from 'node:fs'
import { mkdir, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { logWarn } from '@xtarterize/core'
import type { TemplateConfig } from '@/templates/registry'
import type { PackageManager } from '@/types'
import { initializeGit, isGitInstalled } from '@/utils/git'
import { installDependencies } from '@/utils/install'
import { cleanCIConfigs, modifyPackageJson } from '@/utils/modify-package'

export interface ScaffoldOptions {
	cleanCI: boolean
	force?: boolean
	initGit: boolean
	packageManager: PackageManager
	projectName: string
	projectPath: string
	template: TemplateConfig
	ref?: string
	/** Skip download step — use when projectPath already has template files */
	skipDownload?: boolean
}

export interface ScaffoldResult {
	ciCleaned: boolean
	gitInitialized: boolean
	packageManager: PackageManager
	projectName: string
	projectPath: string
	template: TemplateConfig
}

/**
 * Resolve project path and create/verify directory.
 */
export async function prepareProjectDir(
	projectName: string,
	projectPath: string,
	force?: boolean,
): Promise<void> {
	if (existsSync(projectPath)) {
		const files = await import('node:fs').then((m) =>
			m.readdirSync(projectPath),
		)
		if (files.length > 0) {
			if (force) {
				logWarn(
					`Directory "${projectPath}" exists and is not empty. Overwriting...`,
				)
				await rm(projectPath, { recursive: true, force: true })
				await mkdir(projectPath, { recursive: true })
			} else {
				throw new Error(
					`Directory "${projectName}" already exists and is not empty. Use --force to overwrite.`,
				)
			}
		}
	} else {
		await mkdir(projectPath, { recursive: true })
	}
}

/**
 * Run all post-download scaffold steps: modify package.json, clean CI/CD,
 * install dependencies, and initialize git.
 * Returns a report of what happened.
 */
export async function scaffoldProject(
	options: ScaffoldOptions,
): Promise<ScaffoldResult> {
	const {
		projectName,
		projectPath,
		template,
		packageManager,
		cleanCI,
		initGit,
		ref,
		skipDownload,
	} = options

	let createdDir = false
	if (!existsSync(projectPath)) {
		await mkdir(projectPath, { recursive: true })
		createdDir = true
	}

	try {
		if (!skipDownload) {
			const { downloadTemplateFiles } = await import('@/utils/download')
			await downloadTemplateFiles({
				template,
				targetPath: projectPath,
				ref,
			})
		}

		await modifyPackageJson({
			projectPath,
			projectName,
		})

		if (cleanCI) {
			await cleanCIConfigs({ projectPath })
		}

		await installDependencies({
			packageManager,
			projectPath,
		})

		let gitInitialized = false
		if (initGit) {
			const installed = await isGitInstalled()
			if (installed) {
				await initializeGit({ projectPath })
				gitInitialized = true
			} else {
				logWarn('Git is not installed. Skipping git initialization.')
			}
		}

		return {
			projectName,
			projectPath,
			packageManager,
			template,
			gitInitialized,
			ciCleaned: cleanCI,
		}
	} catch (error) {
		if (createdDir) {
			logWarn('Scaffold failed. Cleaning up...')
			await rm(projectPath, { recursive: true, force: true }).catch(() => {})
		}
		throw error
	}
}

export function resolveProjectPath(name: string): {
	projectName: string
	projectPath: string
} {
	if (!name) {
		throw new Error('Project name is required')
	}
	if (name === '.') {
		const cwd = resolve(process.cwd())
		return { projectName: cwd.split('/').pop() || 'app', projectPath: cwd }
	}
	const projectPath = resolve(process.cwd(), name)
	return { projectName: name, projectPath }
}
