export type { FileDiff, Task, TaskStatus } from '@/_base.js'
export { applyTasks } from '@/apply.js'
export type { Backup } from '@/backup.js'
export {
	backupFile,
	listBackups,
	restoreBackup,
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
	runConflictChecks,
	runToolInstallationChecks,
} from '@/diagnostics.js'
export type { PreflightError, PreflightResult } from '@/preflight.js'
export { runPreflight } from '@/preflight.js'
export { resolveTaskStatuses, resolveTasks } from '@/resolve.js'
export { deepEqual } from '@/utils/deep-equal.js'
export type { FileDiff as CoreFileDiff } from '@/utils/diff.js'
export { formatDiffHeader, generateDiff } from '@/utils/diff.js'
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
	readPackageJson,
	writePackageJson,
} from '@/utils/pkg.js'
