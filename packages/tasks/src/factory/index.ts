// ─── Re-exports from core (convenience) ───
export { deepEqual } from '@xtarterize/core';

// ─── Re-exports from other sub-modules (preserved from existing barrel) ───
export {
  areEquivalent,
  extractTool,
  findEquivalentScriptKey,
  hasScriptWithEquivalentValue,
  normalizeCommand,
  type PackageScriptsMap,
} from './equivalence.js';
export type { ExecTaskOptions } from './exec.js';
export { createExecTask } from './exec.js';
export type {
  CheckFnContext,
  FileTaskOptions,
  MultiFileEntry,
  MultiFileTaskOptions,
} from './file-task.js';
export {
  createFileTask,
  createMultiFileTask,
} from './file-task.js';
export type { JsonConfigTaskOptions } from './json-config.js';
export {
  checkJsonConfigTask,
  dryRunJsonConfigTask,
} from './json-config.js';
export type {
  JsonMergeTaskOptions,
  MultiFileJsonMergeEntry,
  MultiFileJsonMergeTaskOptions,
} from './json-merge-task.js';
export {
  createJsonMergeTask,
  createMultiFileJsonMergeTask,
} from './json-merge-task.js';
export {
  ensureTaskDependency,
  ensureTaskParentDir,
  isExecutableFile,
  wrapTask,
  writeTaskDiffs,
} from './ops.js';
export { lintToolScripts, resolveLintTool } from './package-scripts.js';
export type { PackageJsonScriptEntry, PackageJsonTaskOptions } from './task.js';
export { createPackageJsonTask } from './task.js';
export {
  getDefaultFilepath,
  normalizeExtends,
  normalizeLineEndings,
  resolveTaskFile,
} from './utils.js';
export type { VitePluginTaskOptions } from './vite-plugin-task.js';
export { createVitePluginTask } from './vite-plugin-task.js';
