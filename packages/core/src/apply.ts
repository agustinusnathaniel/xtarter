import { spinner } from '@clack/prompts';

import type { Task, TaskStatus } from '@/_base.js';
import {
  classifyCheckResults,
  collectCheckResults,
} from '@/apply/check-phase.js';
import {
  collectDryRunOutcomes,
  processDryRunOutcomes,
} from '@/apply/dryrun-phase.js';
import {
  backupAndManifest,
  collectAndInstallDeps,
  executeApplyTasks,
} from '@/apply/execute-phase.js';
import type { ProjectProfile } from '@/detect.js';
import type { ApplyTiming } from '@/timing.js';

export interface ApplyOptions {
  includeConflicts?: boolean;
  quiet?: boolean;
  selectedIds?: Array<string>;
}

export interface ApplyResult {
  applied: number;
  errors: Array<string>;
  skipped: number;
  timing?: ApplyTiming;
}

export interface ApplyTasksOptions {
  cwd: string;
  includeConflicts?: boolean;
  profile: ProjectProfile;
  quiet?: boolean;
  selectedIds?: Array<string>;
  statuses?: ReadonlyMap<string, TaskStatus>;
  tasks: Array<Task>;
}

export function applyTasks(options: ApplyTasksOptions): Promise<ApplyResult> {
  const selectedIds = options.selectedIds;
  const toApply = selectedIds
    ? options.tasks.filter((t) => selectedIds.includes(t.id))
    : options.tasks;
  const includeConflicts = options.includeConflicts ?? false;
  const quiet = options.quiet ?? false;
  return runApply({
    cwd: options.cwd,
    includeConflicts,
    profile: options.profile,
    quiet,
    statuses: options.statuses,
    tasks: toApply,
  });
}

interface RunApplyOptions {
  cwd: string;
  includeConflicts: boolean;
  profile: ProjectProfile;
  quiet: boolean;
  statuses?: ReadonlyMap<string, TaskStatus>;
  tasks: Array<Task>;
}

async function runApply(options: RunApplyOptions): Promise<ApplyResult> {
  const { tasks, cwd, profile, includeConflicts, quiet, statuses } = options;
  const applyStart = performance.now();
  const perTask: ApplyTiming['tasks'] = [];
  const s = quiet ? null : spinner();

  const checkResults = await collectCheckResults({
    cwd,
    profile,
    statuses,
    tasks,
  });
  const { toDryRun, skippedInCheck } = classifyCheckResults({
    checkResults,
    includeConflicts,
    perTask,
    quiet,
  });

  const dryRunOutcomes = await collectDryRunOutcomes(toDryRun, cwd, profile);
  const { tasksToRun, filesToBackup, checkErrors } = processDryRunOutcomes(
    dryRunOutcomes,
    perTask
  );

  await backupAndManifest(cwd, filesToBackup);
  await collectAndInstallDeps({ cwd, profile, quiet, tasksToRun });
  const { applied, errors } = await executeApplyTasks({
    cwd,
    perTask,
    profile,
    spinner: s,
    tasksToRun,
  });

  if (!quiet) {
    console.log('');
  }
  return {
    applied,
    errors: [...checkErrors, ...errors],
    skipped: skippedInCheck,
    timing: { applyMs: performance.now() - applyStart, tasks: perTask },
  };
}
