export type {
	ChangeStats,
	DiffHunk,
	FileDiff,
	SemanticEntry,
	Task,
	TaskScope,
	TaskSearchMeta,
	TaskStatus,
} from '@/_base.js'
export type { ApplyOptions, ApplyResult } from '@/apply.js'
export { applyTasks } from '@/apply.js'
export type { Backup, RunManifest } from '@/backup.js'
export {
	backupFile,
	listAllBackups,
	listBackups,
	readRunManifest,
	restoreBackup,
	writeRunManifest,
} from '@/backup.js'
// Detection types
export type {
	Bundler,
	Framework,
	MonorepoDetection,
	PackageManager,
	ProjectProfile,
	Router,
	Styling,
} from '@/detect.js'
// Detection functions - only re-export what users need
export {
	detectFramework,
	detectPackageManager,
	detectProject,
} from '@/detect.js'
export type { DiagnosticCheck } from '@/diagnostics.js'
export {
	checkToolInstalled,
	getToolVersion,
	runConflictChecks,
	runEnvironmentChecks,
	runProjectHealthChecks,
	runToolInstallationChecks,
} from '@/diagnostics.js'
export { BackupError, FileSystemError, TaskError } from '@/errors.js'
// Task inquiry/query engine
export {
	expandQuery,
	scoreTasks,
	similarity,
	tokenize,
} from '@/inquiry/index.js'
export type {
	InquiryOptions,
	InquiryResult,
	RelevanceSignal,
	WeightConfig,
} from '@/inquiry/types.js'
// Plugin/extension system (design spike)
export type { PluginConfig } from '@/plugins.js'
export {
	loadPluginConfig,
	loadPluginTasks,
	resolveExternalTasks,
} from '@/plugins.js'
export type { PreflightError, PreflightResult } from '@/preflight.js'
export { runPreflight } from '@/preflight.js'
export {
	resolveProjectTasks,
	resolveTaskStatuses,
	resolveTasks,
} from '@/resolve.js'
export type { ApplyTiming, ResolveTiming, TaskTiming } from '@/timing.js'
export { deepEqual } from '@/utils/deep-equal.js'
export {
	computeChangeStats,
	computeSemanticJsonDiff,
	computeUnifiedHunks,
	enhanceDiff,
	formatDiffHeader,
	generateDiff,
} from '@/utils/diff.js'
// Re-export utilities needed by tasks
export {
	copyFile,
	ensureDir,
	fileExists,
	findConfigFile,
	readFile,
	readJson,
	readJsonIfExists,
	resolvePath,
	writeFile,
	writeJson,
} from '@/utils/fs.js'
export {
	consola,
	log,
	logError,
	logInfo,
	logSuccess,
	logWarn,
	pc,
} from '@/utils/logger.js'
export {
	getDependencyVersion,
	getNodeVersion,
	hasDependency,
	installDependency,
	readPackageJson,
	writePackageJson,
} from '@/utils/pkg.js'
export { abortIfCancelled, createSpinner, isCI } from '@/utils/prompts.js'
export type { TagColor } from '@/utils/tags.js'
export { actionTag, statusTag, tag } from '@/utils/tags.js'
