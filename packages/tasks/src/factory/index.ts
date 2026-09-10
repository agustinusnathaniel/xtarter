// ─── Re-exports from other sub-modules (preserved from existing barrel) ───
export {
  areEquivalent,
  extractTool,
  findEquivalentScriptKey,
  hasScriptWithEquivalentValue,
  normalizeCommand,
  type PackageScriptsMap,
} from './equivalence.js';
export {
  isExecutableFile,
  wrapTask,
  writeTaskDiffs,
} from './ops.js';
export { lintToolScripts, resolveLintTool } from './package-scripts.js';
export {
  getDefaultFilepath,
  normalizeExtends,
  normalizeLineEndings,
  resolveTaskFile,
} from './utils.js';
