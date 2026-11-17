export {
  appendConfigArrayImports,
  type ConfigArrayImport,
  type ConfigPropertyState,
  type ConfigPropertyValue,
  injectVitePluginIntoCode,
  inspectConfigProperty,
  setConfigProperty,
} from '@/ast-patch.js';
export { mergeJson, parseJsonc, patchJson } from '@/json-merge.js';
