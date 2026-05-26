import type { TemplateProvider } from './templates/registry'

export interface CliOptions {
	/** Remove CI/CD configs */
	clean?: boolean
	/** Overwrite existing directory */
	force?: boolean
	/** Show help message */
	help?: boolean
	/** Project name */
	name?: string
	/** Skip git initialization */
	noGit?: boolean
	/** Package manager to use (skips prompt) */
	pm?: PackageManager
	/** Git ref (branch/tag/commit) to download */
	ref?: string
	/** Template ID to use (skips prompt) */
	template?: string
	/** Show version */
	version?: boolean
}

export type PackageManager = 'pnpm' | 'npm' | 'bun' | 'yarn'

export interface TemplateInfo {
	branch: string
	description: string
	features: string[]
	id: string
	name: string
	provider: TemplateProvider
	repo: string
}
