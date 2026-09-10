import type {
  FileDiff,
  ProjectProfile,
  Task,
  TaskStatus,
} from '@xtarterize/core';
import { mergeJson } from '@xtarterize/patchers';

import { wrapTask } from '@/factory/ops.js';
import {
  applyPackageJsonChange,
  computePackageJsonChange,
  readPackageJson,
} from '@/factory/package-json.js';

const TASK_ID = 'quality/package-engines';

async function resolveIncoming(
  cwd: string,
  profile: ProjectProfile
): Promise<object> {
  const pm = profile.packageManager;
  const pkg = await readPackageJson(cwd);
  const pmField = pkg?.packageManager as string | undefined;
  let pmVersion = pm === 'pnpm' ? '>=9' : '>=10';

  if (pmField) {
    // format: "pnpm@11.8.0" or "npm@10.8.0"
    const atIndex = pmField.indexOf('@');
    if (atIndex !== -1) {
      const version = pmField.slice(atIndex + 1);
      pmVersion = `>=${version}`;
    }
  }

  return {
    devEngines: {
      packageManager: {
        name: pm,
        version: pmVersion,
      },
      runtime: {
        name: 'node',
        version: `>=${profile.nodeVersion}`,
      },
    },
  };
}

async function checkPackageEnginesTask(
  cwd: string,
  profile: ProjectProfile
): Promise<TaskStatus> {
  const pkg = await readPackageJson(cwd);
  if (pkg === null) {
    return 'new';
  }
  const merged = mergeJson(pkg, await resolveIncoming(cwd, profile));
  const change = await computePackageJsonChange(cwd, merged);
  return change === null ? 'skip' : 'patch';
}

async function dryRunPackageEnginesTask(
  cwd: string,
  profile: ProjectProfile
): Promise<Array<FileDiff>> {
  const pkg = await readPackageJson(cwd);
  const merged = mergeJson(pkg ?? {}, await resolveIncoming(cwd, profile));
  const change = await computePackageJsonChange(cwd, merged);
  if (change === null) {
    return [];
  }
  return [
    {
      after: change.after,
      before: change.before,
      filepath: change.filepath,
    },
  ];
}

async function applyPackageEnginesTask(
  cwd: string,
  profile: ProjectProfile
): Promise<void> {
  const pkg = await readPackageJson(cwd);
  const merged = mergeJson(pkg ?? {}, await resolveIncoming(cwd, profile));
  await applyPackageJsonChange(cwd, merged);
}

export const packageEnginesTask: Task = {
  applicable: () => true,
  async apply(cwd, profile): Promise<void> {
    return wrapTask(TASK_ID, 'packageEnginesTask.apply', () =>
      applyPackageEnginesTask(cwd, profile)
    );
  },
  async check(cwd, profile): Promise<TaskStatus> {
    return wrapTask(TASK_ID, 'packageEnginesTask.check', () =>
      checkPackageEnginesTask(cwd, profile)
    );
  },
  async dryRun(cwd, profile): Promise<Array<FileDiff>> {
    return wrapTask(TASK_ID, 'packageEnginesTask.dryRun', () =>
      dryRunPackageEnginesTask(cwd, profile)
    );
  },
  async getDeps() {
    return [];
  },
  group: 'Quality',
  id: TASK_ID,
  label: 'devEngines in package.json',
  scope: 'root',
  searchMeta: {
    configTargets: ['package.json'],
    keywords: [
      'devEngines',
      'engines',
      'node version',
      'package manager',
      'pnpm',
      'runtime',
    ],
    tags: ['quality', 'engines', 'node', 'pnpm', 'package-manager'],
  },
};
