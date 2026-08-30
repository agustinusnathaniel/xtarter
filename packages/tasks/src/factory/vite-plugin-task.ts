import type {
  FileDiff,
  ProjectProfile,
  Task,
  TaskScope,
  TaskSearchMeta,
  TaskStatus,
} from '@xtarterize/core';
import { findConfigFile, readFile, TaskError } from '@xtarterize/core';
import { injectVitePlugin } from '@xtarterize/patchers';

import { ensureTaskDependency, wrapTask } from './ops.js';

// ─── VitePluginTask ───

export interface VitePluginTaskOptions {
  applicable: (profile: ProjectProfile) => boolean;
  checkString: string;
  depName: string;
  group: string;
  id: string;
  importName: string;
  importStyle: 'default' | 'named';
  label: string;
  pluginCall: string;
  scope?: TaskScope;
  searchMeta?: TaskSearchMeta;
}

const VITE_CONFIG_EXTENSIONS = ['.ts', '.js', '.mts', '.mjs', '.cjs', '.cts'];

function getVitePluginTaskDeps(options: VitePluginTaskOptions) {
  return [{ depName: options.depName, dev: true }];
}

async function checkVitePluginTask(
  cwd: string,
  options: VitePluginTaskOptions
): Promise<TaskStatus> {
  const configPath = await findConfigFile(
    cwd,
    'vite.config',
    VITE_CONFIG_EXTENSIONS
  );
  if (!configPath) {
    return 'new';
  }
  const content = await readFile(configPath);
  if (content.includes(options.checkString)) {
    return 'skip';
  }
  return 'new';
}

function buildViteImportSpecifier(options: VitePluginTaskOptions): string {
  return options.importStyle === 'named'
    ? `{ ${options.importName} }`
    : options.importName;
}

async function dryRunVitePluginTask(
  cwd: string,
  options: VitePluginTaskOptions
): Promise<Array<FileDiff>> {
  const configPath = await findConfigFile(
    cwd,
    'vite.config',
    VITE_CONFIG_EXTENSIONS
  );
  if (!configPath) {
    return [];
  }
  const importSpecifier = buildViteImportSpecifier(options);
  const result = await injectVitePlugin({
    configPath,
    dryRun: true,
    importName: importSpecifier,
    importPath: options.depName,
    pluginExpression: options.pluginCall,
  });
  if (!result.success) {
    return [];
  }
  return [
    {
      after: result.generatedCode ?? result.beforeCode ?? '',
      before: result.beforeCode ?? null,
      filepath: 'vite.config',
    },
  ];
}

async function applyVitePluginTask(
  cwd: string,
  options: VitePluginTaskOptions
): Promise<void> {
  await ensureTaskDependency({
    cwd,
    depName: options.depName,
    installDev: true,
  });
  const configPath = await findConfigFile(
    cwd,
    'vite.config',
    VITE_CONFIG_EXTENSIONS
  );
  if (!configPath) {
    throw new TaskError({
      message: `No vite.config file found for ${options.id}`,
      taskId: options.id,
    });
  }
  const importSpecifier = buildViteImportSpecifier(options);
  const result = await injectVitePlugin({
    configPath,
    importName: importSpecifier,
    importPath: options.depName,
    pluginExpression: options.pluginCall,
  });
  if (!result.success) {
    throw new TaskError({
      message: result.fallback ?? `Failed to inject ${options.depName}`,
      taskId: options.id,
    });
  }
}

export function createVitePluginTask(options: VitePluginTaskOptions): Task {
  return {
    applicable: options.applicable,
    async apply(cwd, _profile): Promise<void> {
      return wrapTask(options.id, 'createVitePluginTask.apply', () =>
        applyVitePluginTask(cwd, options)
      );
    },
    async check(cwd, _profile): Promise<TaskStatus> {
      return wrapTask(options.id, 'createVitePluginTask.check', () =>
        checkVitePluginTask(cwd, options)
      );
    },
    async dryRun(cwd, _profile): Promise<Array<FileDiff>> {
      return wrapTask(options.id, 'createVitePluginTask.dryRun', () =>
        dryRunVitePluginTask(cwd, options)
      );
    },
    async getDeps(_cwd, _profile) {
      return getVitePluginTaskDeps(options);
    },
    group: options.group,
    id: options.id,
    label: options.label,
    scope: options.scope,
    searchMeta: options.searchMeta,
  };
}
