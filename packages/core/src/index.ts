export type {
  DiffHunk,
  FileDiff,
  Task,
  TaskScope,
  TaskSearchMeta,
  TaskStatus,
} from '@/_base.js';
export type { ApplyResult } from '@/apply/execute.js';
export { executePlan } from '@/apply/execute.js';
export type { ApplyPlan } from '@/apply/plan.js';
export { planTasks } from '@/apply/plan.js';
export type { Backup } from '@/backup.js';
export {
  backupFile,
  listBackups,
  readRunManifest,
  restoreBackup,
  writeRunManifest,
} from '@/backup.js';
export {
  findFirstPositionalIndex,
  findUnknownFlags,
  suggestSimilar,
  validateInvocation,
} from '@/cli-args.js';
// Detection types
export type {
  Framework,
  PackageManager,
  ProjectProfile,
} from '@/detect.js';
// Detection functions - only re-export what users need
export { detectPackageManager, detectProject } from '@/detect.js';
export type {
  DiagnosticCheck,
  DiagnosticGroup,
} from '@/diagnostics.js';
export { runDiagnostics } from '@/diagnostics.js';
// Gitignore management
export { ensureXtarterizeGitignore } from '@/ensure-gitignore.js';
export { BackupError, TaskError } from '@/errors.js';
// Task inquiry/query engine
export {
  expandQuery,
  scoreTasks,
  similarity,
  tokenize,
} from '@/inquiry/index.js';
export type { InquiryResult } from '@/inquiry/types.js';
export { createInvocationGuard } from '@/invocation-guard.js';
// Plugin/extension system - @internal: stable but untested in production
export type { TaskSelectionConfig } from '@/plugins.js';
export {
  applyTaskSelection,
  loadPluginConfig,
  loadPluginTasks,
  loadSelectionConfig,
  resolveExternalTasks,
} from '@/plugins.js';
export type { PreflightError } from '@/preflight.js';
export { runPreflight } from '@/preflight.js';
export {
  resolveProjectTasks,
  resolveTaskStatuses,
  resolveTasks,
} from '@/resolve.js';
export type { ApplyTiming, ResolveTiming } from '@/timing.js';
export {
  computeSemanticJsonDiff,
  enhanceDiff,
  formatDiffHeader,
  isJsonFile,
} from '@/utils/diff.js';
// Re-export utilities needed by tasks
export {
  assertPathWithin,
  ensureDir,
  fileExists,
  findConfigFile,
  readFile,
  resolvePath,
  writeFile,
} from '@/utils/fs.js';
export {
  consola,
  logError,
  logInfo,
  logSuccess,
  logWarn,
  pc,
} from '@/utils/logger.js';
export {
  collectDependencyVersions,
  hasDependency,
  readPackageJson,
} from '@/utils/pkg.js';
export { abortIfCancelled, createSpinner, isCI } from '@/utils/prompts.js';
export { actionTag, statusTag } from '@/utils/tags.js';
