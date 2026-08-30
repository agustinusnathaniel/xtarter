import type {
  FileDiff,
  ProjectProfile,
  Task,
  TaskScope,
  TaskSearchMeta,
  TaskStatus,
} from '@xtarterize/core';

import { wrapTask } from './ops.js';

export interface ExecTaskOptions {
  applicable: (profile: ProjectProfile) => boolean;
  apply: (cwd: string, profile: ProjectProfile) => Promise<void>;
  check: (cwd: string, profile: ProjectProfile) => Promise<TaskStatus>;
  dryRun: (cwd: string, profile: ProjectProfile) => Promise<Array<FileDiff>>;
  group: string;
  id: string;
  label: string;
  scope?: TaskScope;
  searchMeta?: TaskSearchMeta;
}

export function createExecTask(options: ExecTaskOptions): Task {
  const {
    id,
    label,
    group,
    scope,
    searchMeta,
    applicable,
    check,
    dryRun,
    apply,
  } = options;
  return {
    applicable,
    async apply(cwd, profile) {
      return wrapTask(this.id, 'apply', () => apply(cwd, profile));
    },
    async check(cwd, profile) {
      return wrapTask(this.id, 'check', () => check(cwd, profile));
    },
    async dryRun(cwd, profile) {
      return wrapTask(this.id, 'dryRun', () => dryRun(cwd, profile));
    },
    group,
    id,
    label,
    scope,
    searchMeta,
  };
}
