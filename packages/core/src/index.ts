export type {
  ChangeStats,
  DiffHunk,
  FileDiff,
  SemanticEntry,
  Task,
  TaskScope,
  TaskSearchMeta,
  TaskStatus,
} from '@/_base.js';
export type { ApplyResult, ExecutePlanOptions } from '@/apply/execute.js';
export { executePlan } from '@/apply/execute.js';
export type {
  ApplyPlan,
  ApplyPlanEntry,
  PlanTasksOptions,
} from '@/apply/plan.js';
export { planTasks } from '@/apply/plan.js';
export type { Backup, RunManifest } from '@/backup.js';
export {
  backupFile,
  listBackups,
  readRunManifest,
  restoreBackup,
  writeRunManifest,
} from '@/backup.js';
export type {
  CliArgDefinition,
  CliArgsDefinition,
  InvocationValidationOptions,
  UnknownFlag,
} from '@/cli-args.js';
export {
  findFirstPositionalIndex,
  findUnknownFlags,
  suggestSimilar,
  validateInvocation,
} from '@/cli-args.js';
// Detection types
export type {
  Bundler,
  Framework,
  MonorepoDetection,
  PackageManager,
  ProjectProfile,
  Router,
  Styling,
} from '@/detect.js';
// Detection functions - only re-export what users need
export {
  detectFramework,
  detectPackageManager,
  detectProject,
} from '@/detect.js';
export type {
  DiagnosticCheck,
  DiagnosticGroup,
} from '@/diagnostics.js';
export { runDiagnostics } from '@/diagnostics.js';
export type { EnsureGitignoreResult } from '@/ensure-gitignore.js';
// Gitignore management
export { ensureXtarterizeGitignore } from '@/ensure-gitignore.js';
export { BackupError, FileSystemError, TaskError } from '@/errors.js';
// Task inquiry/query engine
export {
  expandQuery,
  scoreTasks,
  similarity,
  tokenize,
} from '@/inquiry/index.js';
export type {
  InquiryOptions,
  InquiryResult,
  RelevanceSignal,
  WeightConfig,
} from '@/inquiry/types.js';
export { createInvocationGuard } from '@/invocation-guard.js';
// Plugin/extension system — @internal: stable but untested in production
export type { PluginConfig, TaskSelectionConfig } from '@/plugins.js';
export {
  applyTaskSelection,
  loadPluginConfig,
  loadPluginTasks,
  loadSelectionConfig,
  resolveExternalTasks,
} from '@/plugins.js';
export type { PreflightError, PreflightResult } from '@/preflight.js';
export { runPreflight } from '@/preflight.js';
export {
  resolveProjectTasks,
  resolveTaskStatuses,
  resolveTasks,
} from '@/resolve.js';
export type { ApplyTiming, ResolveTiming, TaskTiming } from '@/timing.js';
export {
  computeChangeStats,
  computeSemanticJsonDiff,
  computeUnifiedHunks,
  enhanceDiff,
  formatDiffHeader,
} from '@/utils/diff.js';
// Re-export utilities needed by tasks
export {
  assertPathWithin,
  ensureDir,
  fileExists,
  findConfigFile,
  readFile,
  readJson,
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
  hasDependency,
  installDependenciesBatch,
  readPackageJson,
} from '@/utils/pkg.js';
export { abortIfCancelled, createSpinner, isCI } from '@/utils/prompts.js';
export type { TagColor } from '@/utils/tags.js';
export { actionTag, statusTag, tag } from '@/utils/tags.js';
