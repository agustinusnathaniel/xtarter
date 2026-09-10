import { Effect } from 'effect';

import type { Task, TaskStatus } from '@/_base.js';
import type { ProjectProfile } from '@/detect.js';
import { detectProject } from '@/detect.js';
import { TaskError } from '@/errors.js';
import type { ResolveTiming } from '@/timing.js';
import { logWarn } from '@/utils/logger.js';

export const CONCURRENCY = 8;

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

function runCheckTask(
  task: Task,
  cwd: string,
  profile: ProjectProfile
): Effect.Effect<CheckOutcome, never> {
  return Effect.tryPromise({
    catch: (cause) =>
      new TaskError({
        cause,
        message: `Failed to check ${task.id}`,
        taskId: task.id,
      }),
    try: (_signal) => task.check(cwd, profile),
  }).pipe(
    Effect.map((status): CheckOutcome => ({ status })),
    Effect.catchTag('TaskError', (error) => {
      const detail =
        error.cause instanceof Error
          ? error.cause.message
          : String(error.cause);
      logWarn(`Failed to check ${task.id}: ${detail}`);
      return Effect.succeed<CheckOutcome>({
        checkError: detail,
        status: 'conflict',
      });
    })
  );
}

export function collectTaskChecks(options: {
  cwd: string;
  profile: ProjectProfile;
  statuses?: ReadonlyMap<string, TaskStatus>;
  tasks: Array<Task>;
}): Promise<Array<TaskCheckResult>> {
  const { cwd, profile, statuses, tasks } = options;
  return Effect.runPromise(
    Effect.all(
      tasks.map((task) => {
        const precomputed = statuses?.get(task.id);
        if (precomputed !== undefined) {
          return Effect.succeed<TaskCheckResult>({
            checkMs: 0,
            status: precomputed,
            task,
          });
        }
        return Effect.gen(function* () {
          const start = performance.now();
          const outcome = yield* runCheckTask(task, cwd, profile);
          return {
            checkMs: performance.now() - start,
            task,
            ...outcome,
          };
        });
      }),
      { concurrency: CONCURRENCY }
    )
  );
}

export function resolveTaskStatuses(
  tasks: Array<Task>,
  cwd: string,
  profile: ProjectProfile
): Promise<Map<string, TaskStatus>> {
  return collectTaskChecks({ cwd, profile, tasks }).then(
    (results) =>
      new Map(results.map(({ task, status }) => [task.id, status] as const))
  );
}

export async function resolveProjectTasks(
  cwd: string,
  allTasks: Array<Task>,
  externalTasks?: Array<Task>
): Promise<{
  profile: ProjectProfile;
  tasks: Array<Task>;
  statuses: Map<string, TaskStatus>;
  timing: ResolveTiming;
}> {
  const detectionStart = performance.now();
  const profile = await detectProject(cwd);
  const detectionMs = performance.now() - detectionStart;

  const mergedTasks: Array<Task> = externalTasks
    ? [
        ...new Map(
          [...allTasks, ...externalTasks].map((t) => [t.id, t])
        ).values(),
      ]
    : allTasks;
  const applicableTasks = resolveTasks(profile, mergedTasks);

  const resolutionStart = performance.now();
  const checkResults = await collectTaskChecks({
    cwd,
    profile,
    tasks: applicableTasks,
  });
  const resolutionMs = performance.now() - resolutionStart;

  const statuses = new Map(
    checkResults.map(({ task, status }) => [task.id, status] as const)
  );
  const checkSumMs = checkResults.reduce(
    (sum, { checkMs }) => sum + checkMs,
    0
  );

  return {
    profile,
    statuses,
    tasks: applicableTasks,
    timing: { detectionMs, resolutionMs, resolutionSumMs: checkSumMs },
  };
}
