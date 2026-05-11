import type { TemplateProvider } from './templates/registry'

export interface CliOptions {
	/** Remove CI/CD configs */
	clean?: boolean
	/** Show help message */
	help?: boolean
	/** Project name */
	name?: string
	/** Skip git initialization */
	noGit?: boolean
	/** Package manager to use (skips prompt) */
	pm?: PackageManager
	/** Template ID to use (skips prompt) */
	template?: string
	/** Show version */
	version?: boolean
}

export type PackageManager = 'pnpm' | 'npm' | 'bun' | 'yarn'

export interface TemplateInfo {
	branch: string
	description: string
	id: string
	name: string
	provider: TemplateProvider
	repo: string
}

export interface ScaffoldResult {
	cleanMode: boolean
	gitInitialized: boolean
	packageManager: PackageManager
	projectName: string
	projectPath: string
	template: TemplateInfo
}
