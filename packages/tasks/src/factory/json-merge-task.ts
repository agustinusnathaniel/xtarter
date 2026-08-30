import type {
  FileDiff,
  ProjectProfile,
  Task,
  TaskScope,
  TaskSearchMeta,
  TaskStatus,
} from '@xtarterize/core';
import {
  fileExists,
  installDependenciesBatch,
  readFile,
} from '@xtarterize/core';

import type { CheckFnContext } from './file-task.js';
import { checkJsonConfigTask, dryRunJsonConfigTask } from './json-config.js';
import { checkMissingDeps, wrapTask, writeTaskDiffs } from './ops.js';
import { resolveTaskFile } from './utils.js';

// ─── JsonMergeTask ───

export interface JsonMergeTaskOptions {
  applicable: (profile: ProjectProfile) => boolean;
  checkFn?: (context: CheckFnContext) => Promise<TaskStatus>;
  depInstallName?: string;
  depName?: string;
  depNames?: Array<string>;
  extensions?: Array<string>;
  filepath: string;
  group: string;
  id: string;
  incoming: (cwd: string, profile: ProjectProfile) => object | Promise<object>;
  installDev?: boolean;
  label: string;
  scope?: TaskScope;
  searchMeta?: TaskSearchMeta;
}

function getJsonMergeTaskDeps(options: JsonMergeTaskOptions) {
  const deps = options.depNames ?? (options.depName ? [options.depName] : []);
  return deps.map((dep) => ({
    depName: options.depInstallName ?? dep,
    dev: options.installDev ?? true,
  }));
}

async function checkJsonMergeTask(
  cwd: string,
  profile: ProjectProfile,
  options: JsonMergeTaskOptions
): Promise<TaskStatus> {
  const fullPath = await resolveTaskFile(
    cwd,
    options.filepath,
    options.extensions
  );
  if (!fullPath) {
    return 'new';
  }
  const exists = await fileExists(fullPath);
  if (!exists) {
    return 'new';
  }
  if (options.checkFn) {
    const content = await readFile(fullPath);
    return options.checkFn({ content, cwd, fullPath, profile });
  }
  const missingDep = await checkMissingDeps(cwd, {
    depName: options.depName,
    depNames: options.depNames,
  });
  if (missingDep) {
    return missingDep;
  }
  return checkJsonConfigTask(cwd, profile, {
    extensions: options.extensions,
    filepath: options.filepath,
    incoming: options.incoming,
  });
}

function dryRunJsonMergeTask(
  cwd: string,
  profile: ProjectProfile,
  options: JsonMergeTaskOptions
): Promise<Array<FileDiff>> {
  return dryRunJsonConfigTask(cwd, profile, {
    extensions: options.extensions,
    filepath: options.filepath,
    incoming: options.incoming,
  });
}

async function applyJsonMergeTask(
  cwd: string,
  profile: ProjectProfile,
  options: JsonMergeTaskOptions
): Promise<void> {
  const diffs = await dryRunJsonMergeTask(cwd, profile, options);
  await writeTaskDiffs(cwd, diffs);
  const deps = options.depNames ?? (options.depName ? [options.depName] : []);
  if (deps.length > 0) {
    await installDependenciesBatch(
      cwd,
      deps.map((dep) => ({
        depName: options.depInstallName ?? dep,
        dev: options.installDev ?? true,
      }))
    );
  }
}

export function createJsonMergeTask(options: JsonMergeTaskOptions): Task {
  return {
    applicable: options.applicable,
    async apply(cwd, profile): Promise<void> {
      return wrapTask(options.id, 'createJsonMergeTask.apply', () =>
        applyJsonMergeTask(cwd, profile, options)
      );
    },
    async check(cwd, profile): Promise<TaskStatus> {
      return wrapTask(options.id, 'createJsonMergeTask.check', () =>
        checkJsonMergeTask(cwd, profile, options)
      );
    },
    async dryRun(cwd, profile): Promise<Array<FileDiff>> {
      return wrapTask(options.id, 'createJsonMergeTask.dryRun', () =>
        dryRunJsonMergeTask(cwd, profile, options)
      );
    },
    async getDeps(_cwd, _profile) {
      return getJsonMergeTaskDeps(options);
    },
    group: options.group,
    id: options.id,
    label: options.label,
    scope: options.scope,
    searchMeta: options.searchMeta,
  };
}

// ─── MultiFileJsonMergeTask ───

export interface MultiFileJsonMergeEntry {
  extensions?: Array<string>;
  filepath: string;
  incoming: (profile: ProjectProfile) => object | Promise<object>;
  merge?: (existing: object, incoming: object) => object;
}

export interface MultiFileJsonMergeTaskOptions {
  applicable: (profile: ProjectProfile) => boolean;
  files: Array<MultiFileJsonMergeEntry>;
  group: string;
  id: string;
  label: string;
  scope?: TaskScope;
  searchMeta?: TaskSearchMeta;
}

async function checkMultiFileJsonMergeTask(
  cwd: string,
  profile: ProjectProfile,
  options: MultiFileJsonMergeTaskOptions
): Promise<TaskStatus> {
  let status: TaskStatus = 'skip';
  for (const f of options.files) {
    const entryStatus = await checkJsonConfigTask(cwd, profile, {
      extensions: f.extensions,
      filepath: f.filepath,
      incoming: async () => f.incoming(profile),
      merge: f.merge,
    });
    if (entryStatus === 'conflict') {
      status = 'conflict';
      continue;
    }
    if (entryStatus === 'patch') {
      status = 'patch';
      continue;
    }
    if (entryStatus === 'new' && status !== 'patch' && status !== 'conflict') {
      status = 'new';
    }
  }
  return status;
}

async function dryRunMultiFileJsonMergeTask(
  cwd: string,
  profile: ProjectProfile,
  options: MultiFileJsonMergeTaskOptions
): Promise<Array<FileDiff>> {
  const diffs: Array<FileDiff> = [];
  for (const f of options.files) {
    const entryDiffs = await dryRunJsonConfigTask(cwd, profile, {
      extensions: f.extensions,
      filepath: f.filepath,
      incoming: async () => f.incoming(profile),
      merge: f.merge,
    });
    diffs.push(...entryDiffs);
  }
  return diffs;
}

async function applyMultiFileJsonMergeTask(
  cwd: string,
  profile: ProjectProfile,
  options: MultiFileJsonMergeTaskOptions
): Promise<void> {
  const diffs = await dryRunMultiFileJsonMergeTask(cwd, profile, options);
  await writeTaskDiffs(cwd, diffs);
}

export function createMultiFileJsonMergeTask(
  options: MultiFileJsonMergeTaskOptions
): Task {
  return {
    applicable: options.applicable,
    async apply(cwd, profile): Promise<void> {
      return wrapTask(options.id, 'createMultiFileJsonMergeTask.apply', () =>
        applyMultiFileJsonMergeTask(cwd, profile, options)
      );
    },
    async check(cwd, profile): Promise<TaskStatus> {
      return wrapTask(options.id, 'createMultiFileJsonMergeTask.check', () =>
        checkMultiFileJsonMergeTask(cwd, profile, options)
      );
    },
    async dryRun(cwd, profile): Promise<Array<FileDiff>> {
      return wrapTask(options.id, 'createMultiFileJsonMergeTask.dryRun', () =>
        dryRunMultiFileJsonMergeTask(cwd, profile, options)
      );
    },
    group: options.group,
    id: options.id,
    label: options.label,
    scope: options.scope,
    searchMeta: options.searchMeta,
  };
}
