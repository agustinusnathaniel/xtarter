import { Cause, Effect, Exit } from 'effect';

import type {
  FileDiff,
  Task,
  TaskDep,
  TaskServices,
  TaskStatus,
} from '@/_base.js';
import type { ProjectProfile } from '@/detect.js';
import type { TaskError } from '@/errors.js';
import {
  collectTaskChecks,
  failureDetail,
  type TaskCheckResult,
} from '@/resolve.js';
import { toTaskEffect } from '@/task-effect.js';
import { logInfo } from '@/utils/logger.js';
import type { DepToInstall } from '@/utils/pkg.js';

const TASK_CONCURRENCY = 8;

export interface PlanTasksOptions {
  cwd: string;
  includeConflicts?: boolean;
  profile: ProjectProfile;
  quiet?: boolean;
  statuses?: ReadonlyMap<string, TaskStatus>;
  tasks: Array<Task>;
}

export interface ApplyPlanEntry {
  /** Set by `executePlan` when this entry's apply fails. */
  applyError?: string;
  checkError?: string;
  checkMs: number;
  diffs: Array<FileDiff>;
  /** Full `taskId: message` string, matching `ApplyResult.errors` entries. */
  dryRunError?: string;
  dryRunMs: number;
  skipped: boolean;
  status: TaskStatus;
  task: Task;
}

export interface ApplyPlan {
  dependencies: Array<DepToInstall>;
  entries: Array<ApplyPlanEntry>;
  files: Array<string>;
}

interface ClassifiedCheck {
  result: TaskCheckResult;
  skipped: boolean;
}

function shouldSkip(status: TaskStatus, includeConflicts: boolean): boolean {
  if (status === 'skip') {
    return true;
  }
  if (status === 'conflict' && !includeConflicts) {
    return true;
  }
  return false;
}

function classifyChecks(
  checkResults: Array<TaskCheckResult>,
  includeConflicts: boolean,
  quiet: boolean
): Array<ClassifiedCheck> {
  const classifications = checkResults.map((result) => ({
    result,
    skipped: shouldSkip(result.status, includeConflicts),
  }));
  for (const { result, skipped } of classifications) {
    if (
      skipped &&
      result.status === 'conflict' &&
      !includeConflicts &&
      !quiet
    ) {
      logInfo(`Skipping conflict: ${result.task.label} (${result.task.id})`);
    }
  }
  return classifications;
}

interface DryRunOutcome {
  diffs: Array<FileDiff>;
  dryRunError?: string;
  dryRunMs: number;
}

function runDryRun(
  task: Task,
  cwd: string,
  profile: ProjectProfile
): Effect.Effect<DryRunOutcome, never, TaskServices> {
  const start = performance.now();
  return Effect.exit(
    toTaskEffect(task.id, () => task.dryRun(cwd, profile))
  ).pipe(
    Effect.flatMap((exit) => {
      if (Exit.isSuccess(exit)) {
        return Effect.succeed({
          diffs: exit.value,
          dryRunMs: performance.now() - start,
        });
      }
      if (Cause.hasInterruptsOnly(exit.cause)) {
        return Effect.interrupt;
      }
      const detail = failureDetail(exit.cause);
      return Effect.succeed({
        diffs: [] as Array<FileDiff>,
        dryRunError: `${task.id}: ${detail}`,
        dryRunMs: 0,
      });
    })
  );
}

function buildEntries(
  classifications: Array<ClassifiedCheck>,
  dryRuns: Array<DryRunOutcome>
): { entries: Array<ApplyPlanEntry>; files: Array<string> } {
  const entries: Array<ApplyPlanEntry> = [];
  const files = new Set<string>();
  let candidateIndex = 0;

  for (const { result, skipped } of classifications) {
    if (skipped) {
      entries.push({
        checkError: result.checkError,
        checkMs: result.checkMs,
        diffs: [],
        dryRunMs: 0,
        skipped: true,
        status: result.status,
        task: result.task,
      });
      continue;
    }

    const outcome = dryRuns[candidateIndex];
    candidateIndex += 1;
    entries.push({
      checkError: result.checkError,
      checkMs: result.checkMs,
      diffs: outcome.diffs,
      dryRunError: outcome.dryRunError,
      dryRunMs: outcome.dryRunMs,
      skipped: false,
      status: result.status,
      task: result.task,
    });
    if (!outcome.dryRunError) {
      for (const diff of outcome.diffs) {
        files.add(diff.filepath);
      }
    }
  }

  return { entries, files: [...files] };
}

function collectDependencies(options: {
  cwd: string;
  entries: Array<ApplyPlanEntry>;
  profile: ProjectProfile;
}): Effect.Effect<Array<DepToInstall>, TaskError, TaskServices> {
  const { cwd, entries, profile } = options;
  const runnable = entries.filter(
    (entry) => !(entry.skipped || entry.dryRunError)
  );
  return Effect.forEach(
    runnable,
    ({ task }) =>
      toTaskEffect(task.id, () =>
        task.getDeps
          ? task.getDeps(cwd, profile)
          : Promise.resolve([] as Array<TaskDep>)
      ),
    { concurrency: TASK_CONCURRENCY }
  ).pipe(Effect.map((depArrays) => depArrays.flat()));
}

export function planTasks(
  options: PlanTasksOptions
): Effect.Effect<ApplyPlan, TaskError, TaskServices> {
  const { cwd, profile, statuses, tasks } = options;
  const includeConflicts = options.includeConflicts ?? false;
  const quiet = options.quiet ?? false;

  return Effect.gen(function* () {
    const checkResults = yield* collectTaskChecks({
      cwd,
      profile,
      statuses,
      tasks,
    });
    const classifications = classifyChecks(
      checkResults,
      includeConflicts,
      quiet
    );
    const candidates = classifications
      .filter(({ skipped }) => !skipped)
      .map(({ result }) => result);
    const dryRuns = yield* Effect.forEach(
      candidates,
      ({ task }) => runDryRun(task, cwd, profile),
      { concurrency: TASK_CONCURRENCY }
    );
    const { entries, files } = buildEntries(classifications, dryRuns);

    return {
      dependencies: yield* collectDependencies({ cwd, entries, profile }),
      entries,
      files,
    };
  });
}
