import { TaskError } from '@xtarterize/core';
import { injectVitePluginIntoCode } from '@xtarterize/patchers';

import type { TransformTarget } from '@/factory/define-task.js';

export const VITE_CONFIG_EXTENSIONS = [
  '.ts',
  '.js',
  '.mts',
  '.mjs',
  '.cjs',
  '.cts',
];

export interface VitePluginInjection {
  depName: string;
  id: string;
  importName: string;
  importStyle: 'default' | 'named';
  pluginCall: string;
}

/**
 * Build the transform target the vite plugin tasks share: discover the config
 * by extension, inject the plugin into its content in memory, and report the
 * real config path so diffs, backups, and undo cover the actual file.
 */
export function createVitePluginTarget(
  injection: VitePluginInjection
): TransformTarget {
  return {
    extensions: VITE_CONFIG_EXTENSIONS,
    filepath: 'vite.config',
    kind: 'transform',
    transform: (content) => {
      const result = injectVitePluginIntoCode(content, {
        configPath: 'vite.config',
        importName:
          injection.importStyle === 'named'
            ? `{ ${injection.importName} }`
            : injection.importName,
        importPath: injection.depName,
        pluginExpression: injection.pluginCall,
      });
      if (!result.success) {
        throw new TaskError({
          message: result.fallback ?? `Failed to inject ${injection.depName}`,
          taskId: injection.id,
        });
      }
      return result.generatedCode ?? null;
    },
  };
}
