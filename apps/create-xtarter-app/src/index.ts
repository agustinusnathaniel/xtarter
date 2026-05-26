// Main entry point for programmatic usage

export type { ScaffoldOptions, ScaffoldResult } from '@/scaffold'
export {
	prepareProjectDir,
	resolveProjectPath,
	scaffoldProject,
} from '@/scaffold'
export type { TemplateConfig } from '@/templates/registry'
export {
	getTemplateById,
	getTemplateChoices,
	TEMPLATES,
} from '@/templates/registry'
export type {
	CliOptions,
	PackageManager,
	TemplateInfo,
} from '@/types'
export { downloadTemplateFiles } from '@/utils/download'
export { initializeGit, isGitInstalled } from '@/utils/git'
export { installDependencies } from '@/utils/install'
export { cleanCIConfigs, modifyPackageJson } from '@/utils/modify-package'
