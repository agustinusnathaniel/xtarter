import { Cause, Effect, Exit, Option, Result } from 'effect';

import type { Task, TaskServices, TaskStatus } from '@/_base.js';
import type { ProjectProfile } from '@/detect.js';
import { detectProject } from '@/detect.js';
import { TaskError } from '@/errors.js';
import { describeCause, toTaskEffect } from '@/task-effect.js';
import type { ResolveTiming } from '@/timing.js';
import { logWarn } from '@/utils/logger.js';

const TASK_CONCURRENCY = 8;

export interface TaskCheckResult {
  checkError?: string;
  checkMs: number;
  status: TaskStatus;
  task: Task;
}

export function resolveTasks(
  profile: ProjectProfile,
  allTasks: Array<Task>
): Array<Task> {
  return allTasks.filter((task) => {
    if (!task.applicable(profile)) {
      return false;
    }

    // Scope filtering for monorepos
    if (profile.monorepo) {
      const scope = task.scope ?? 'both';
      if (profile.workspaceRoot && scope === 'package') {
        return false;
      }
      if (!profile.workspaceRoot && scope === 'root') {
        return false;
      }
    }

    return true;
  });
}

interface CheckOutcome {
  checkError?: string;
  status: TaskStatus;
}

/** Message text the pre-Effect engine extracted from a failed task call. */
export function failureDetail(cause: Cause.Cause<unknown>): string {
  const error = Cause.findErrorOption(cause);
  if (Option.isSome(error)) {
    return describeCause(error.value);
  }
  const defect = Cause.findDefect(cause);
  if (Result.isSuccess(defect)) {
    return describeCause(defect.success);
  }
  return Cause.pretty(cause);
}

function runCheckTask(
  task: Task,
  cwd: string,
  profile: ProjectProfile
): Effect.Effect<CheckOutcome, never, TaskServices> {
  return Effect.exit(
    toTaskEffect(task.id, () => task.check(cwd, profile))
  ).pipe(
    Effect.flatMap((exit) => {
      if (Exit.isSuccess(exit)) {
        return Effect.succeed({ status: exit.value });
      }
      if (Cause.hasInterruptsOnly(exit.cause)) {
        return Effect.interrupt;
      }
      const detail = failureDetail(exit.cause);
      return Effect.sync(() => {
        logWarn(`Failed to check ${task.id}: ${detail}`);
        return { checkError: detail, status: 'conflict' as const };
      });
    })
  );
}

export function collectTaskChecks(options: {
  cwd: string;
  profile: ProjectProfile;
  statuses?: ReadonlyMap<string, TaskStatus>;
  tasks: Array<Task>;
}): Effect.Effect<Array<TaskCheckResult>, never, TaskServices> {
  const { cwd, profile, statuses, tasks } = options;
  return Effect.forEach(
    tasks,
    (task): Effect.Effect<TaskCheckResult, never, TaskServices> => {
      const precomputed = statuses?.get(task.id);
      if (precomputed !== undefined) {
        return Effect.succeed({
          checkMs: 0,
          status: precomputed,
          task,
        });
      }
      const start = performance.now();
      return runCheckTask(task, cwd, profile).pipe(
        Effect.map(
          (outcome): TaskCheckResult => ({
            checkMs: performance.now() - start,
            task,
            ...outcome,
          })
        )
      );
    },
    { concurrency: TASK_CONCURRENCY }
  );
}

export function resolveTaskStatuses(
  tasks: Array<Task>,
  cwd: string,
  profile: ProjectProfile
): Effect.Effect<Map<string, TaskStatus>, never, TaskServices> {
  return Effect.map(
    collectTaskChecks({ cwd, profile, tasks }),
    (results) =>
      new Map(results.map(({ task, status }) => [task.id, status] as const))
  );
}

export function resolveProjectTasks(
  cwd: string,
  allTasks: Array<Task>
): Effect.Effect<
  {
    checkErrors: Map<string, string>;
    profile: ProjectProfile;
    tasks: Array<Task>;
    statuses: Map<string, TaskStatus>;
    timing: ResolveTiming;
  },
  TaskError,
  TaskServices
> {
  return Effect.gen(function* () {
    const detectionStart = performance.now();
    const profile = yield* Effect.tryPromise({
      catch: (cause) =>
        new TaskError({
          cause,
          message: describeCause(cause),
          taskId: 'project-detection',
        }),
      try: () => detectProject(cwd),
    });
    const detectionMs = performance.now() - detectionStart;

    const applicableTasks = resolveTasks(profile, allTasks);

    const resolutionStart = performance.now();
    const checkResults = yield* collectTaskChecks({
      cwd,
      profile,
      tasks: applicableTasks,
    });
    const resolutionMs = performance.now() - resolutionStart;

    const statuses = new Map(
      checkResults.map(({ task, status }) => [task.id, status] as const)
    );
    const checkErrors = new Map<string, string>();
    for (const { checkError, task } of checkResults) {
      if (checkError !== undefined) {
        checkErrors.set(task.id, checkError);
      }
    }
    const checkSumMs = checkResults.reduce(
      (sum, { checkMs }) => sum + checkMs,
      0
    );

    return {
      checkErrors,
      profile,
      statuses,
      tasks: applicableTasks,
      timing: { detectionMs, resolutionMs, resolutionSumMs: checkSumMs },
    };
  });
}
