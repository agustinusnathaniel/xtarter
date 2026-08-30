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
  resolvePath,
} from '@xtarterize/core';
import { mergeJson, parseJsonc } from '@xtarterize/patchers';
import JSON5 from 'json5';
import { relative } from 'pathe';

import {
  checkMissingDeps,
  ensureTaskDependency,
  ensureTaskParentDir,
  wrapTask,
  writeTaskDiffs,
} from './ops.js';
import {
  getDefaultFilepath,
  normalizeLineEndings,
  resolveTaskFile,
} from './utils.js';

// ─── Reusable context for checkFn callbacks ───

export interface CheckFnContext {
  content: string | null;
  cwd: string;
  fullPath: string | null;
  profile: ProjectProfile;
}

// ─── Shared helpers ───

async function computeFileDiffs(
  cwd: string,
  profile: ProjectProfile,
  files: Array<MultiFileEntry>
): Promise<Array<FileDiff>> {
  const diffs: Array<FileDiff> = [];
  for (const f of files) {
    const fullPath = resolvePath(cwd, f.filepath);
    const exists = await fileExists(fullPath);
    const before = exists ? await readFile(fullPath) : null;
    const after = f.content(profile);
    if (!exists || before?.trim() !== after.trim()) {
      diffs.push({
        after,
        before,
        filepath: relative(cwd, fullPath),
      });
    }
  }
  return diffs;
}

async function computeSingleFileDiff(
  cwd: string,
  profile: ProjectProfile,
  options: FileTaskOptions
): Promise<FileDiff> {
  const fullPath = await resolveTaskFile(
    cwd,
    options.filepath,
    options.extensions
  );
  const exists = fullPath !== null && (await fileExists(fullPath));
  const before = exists ? await readFile(fullPath) : null;
  const filepath = exists
    ? relative(cwd, fullPath)
    : getDefaultFilepath(options.filepath, options.extensions);
  const after = options.render(profile, before);
  return { after, before, filepath };
}

// ─── FileTask (text files with optional merge/checkFn) ───

export interface FileTaskOptions {
  applicable: (profile: ProjectProfile) => boolean;
  checkFn?: (context: CheckFnContext) => Promise<TaskStatus>;
  depInstallName?: string;
  depName?: string;
  depNames?: Array<string>;
  ensureParentDir?: boolean;
  extensions?: Array<string>;
  filepath: string;
  group: string;
  id: string;
  installDev?: boolean;
  label: string;
  merge?: boolean;
  render: (profile: ProjectProfile, existing: string | null) => string;
  scope?: TaskScope;
  searchMeta?: TaskSearchMeta;
}

function getFileTaskDeps(options: FileTaskOptions) {
  const deps = options.depNames ?? (options.depName ? [options.depName] : []);
  return deps.map((dep) => ({
    depName: options.depInstallName ?? dep,
    dev: options.installDev ?? true,
  }));
}

async function checkFileTask(
  cwd: string,
  profile: ProjectProfile,
  options: FileTaskOptions
): Promise<TaskStatus> {
  const fullPath = await resolveTaskFile(
    cwd,
    options.filepath,
    options.extensions
  );
  if (!fullPath) {
    return 'new' as TaskStatus;
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
  const expected = options.render(profile, null);
  const actual = await readFile(fullPath);
  if (options.merge) {
    return checkFileTaskMerge(actual, expected);
  }
  if (
    normalizeLineEndings(actual.trim()) ===
    normalizeLineEndings(expected.trim())
  ) {
    return 'skip';
  }
  return 'conflict';
}

function checkFileTaskMerge(actual: string, expected: string): TaskStatus {
  try {
    const actualJson = parseJsonc(actual) as object;
    const expectedJson = JSON5.parse(expected);
    const merged = mergeJson(actualJson, expectedJson);
    if (JSON.stringify(actualJson) === JSON.stringify(merged)) {
      return 'skip';
    }
    return 'patch';
  } catch {
    return 'conflict';
  }
}

async function dryRunFileTask(
  cwd: string,
  profile: ProjectProfile,
  options: FileTaskOptions
): Promise<Array<FileDiff>> {
  const diff = await computeSingleFileDiff(cwd, profile, options);
  return [diff];
}

async function applyFileTask(
  cwd: string,
  profile: ProjectProfile,
  options: FileTaskOptions
): Promise<void> {
  const deps = options.depNames ?? (options.depName ? [options.depName] : []);
  if (deps.length > 0) {
    const installDeps = deps.map((dep) => ({
      depName: options.depInstallName ?? dep,
      dev: options.installDev ?? true,
    }));
    await installDependenciesBatch(cwd, installDeps);
  }
  if (options.ensureParentDir) {
    await ensureTaskParentDir(cwd, options.filepath);
  }
  const diff = await computeSingleFileDiff(cwd, profile, options);
  await writeTaskDiffs(cwd, [diff]);
}

export function createFileTask(options: FileTaskOptions): Task {
  return {
    applicable: options.applicable,
    async apply(cwd, profile): Promise<void> {
      return wrapTask(options.id, 'createFileTask.apply', () =>
        applyFileTask(cwd, profile, options)
      );
    },
    async check(cwd, profile): Promise<TaskStatus> {
      return wrapTask(options.id, 'createFileTask.check', () =>
        checkFileTask(cwd, profile, options)
      );
    },
    async dryRun(cwd, profile): Promise<Array<FileDiff>> {
      return wrapTask(options.id, 'createFileTask.dryRun', () =>
        dryRunFileTask(cwd, profile, options)
      );
    },
    async getDeps(_cwd, _profile) {
      return getFileTaskDeps(options);
    },
    group: options.group,
    id: options.id,
    label: options.label,
    scope: options.scope,
    searchMeta: options.searchMeta,
  };
}

// ─── MultiFileTask ───

export interface MultiFileEntry {
  content: (profile: ProjectProfile) => string;
  filepath: string;
}

export interface MultiFileTaskOptions {
  applicable: (profile: ProjectProfile) => boolean;
  depInstallName?: string;
  depName?: string;
  files: (profile: ProjectProfile) => Array<MultiFileEntry>;
  group: string;
  id: string;
  installDev?: boolean;
  label: string;
  scope?: TaskScope;
  searchMeta?: TaskSearchMeta;
}

export function createMultiFileTask(options: MultiFileTaskOptions): Task {
  return {
    applicable: options.applicable,

    async apply(cwd, profile): Promise<void> {
      return wrapTask(options.id, 'createMultiFileTask.apply', async () => {
        await ensureTaskDependency({
          cwd,
          depInstallName: options.depInstallName,
          depName: options.depName,
          installDev: options.installDev,
        });

        const diffs = await computeFileDiffs(
          cwd,
          profile,
          options.files(profile)
        );
        await writeTaskDiffs(cwd, diffs);
      });
    },

    async check(cwd, profile): Promise<TaskStatus> {
      return wrapTask(options.id, 'createMultiFileTask.check', async () => {
        const files = options.files(profile);
        let hasMissing = false;
        let hasMismatch = false;

        for (const f of files) {
          const fullPath = resolvePath(cwd, f.filepath);
          const exists = await fileExists(fullPath);
          if (!exists) {
            hasMissing = true;
            continue;
          }
          const expected = f.content(profile);
          const actual = await readFile(fullPath);
          if (actual.trim() !== expected.trim()) {
            hasMismatch = true;
          }
        }

        if (hasMismatch) {
          return 'conflict';
        }
        if (hasMissing) {
          return 'new';
        }

        if (options.depName) {
          const missingDep = await checkMissingDeps(cwd, {
            depName: options.depName,
          });
          if (missingDep) {
            return missingDep;
          }
        }

        return 'skip';
      });
    },

    async dryRun(cwd, profile): Promise<Array<FileDiff>> {
      return wrapTask(options.id, 'createMultiFileTask.dryRun', () =>
        computeFileDiffs(cwd, profile, options.files(profile))
      );
    },
    group: options.group,
    id: options.id,
    label: options.label,
    scope: options.scope,
    searchMeta: options.searchMeta,
  };
}
