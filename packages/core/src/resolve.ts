import { Effect } from 'effect';

import type { Task, TaskStatus } from '@/_base.js';
import type { ProjectProfile } from '@/detect.js';
import { detectProject } from '@/detect.js';
import { TaskError } from '@/errors.js';
import type { ResolveTiming } from '@/timing.js';
import { logWarn } from '@/utils/logger.js';

const CONCURRENCY = 8;

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

export function checkTask(
  task: Task,
  cwd: string,
  profile: ProjectProfile
): Effect.Effect<TaskStatus, never> {
  return Effect.tryPromise({
    catch: (cause) =>
      new TaskError({
        cause,
        message: `Failed to check ${task.id}`,
        taskId: task.id,
      }),
    try: (_signal) => task.check(cwd, profile),
  }).pipe(
    Effect.catchTag('TaskError', (error) => {
      const detail =
        error.cause instanceof Error
          ? error.cause.message
          : String(error.cause);
      logWarn(`Failed to check ${task.id}: ${detail}`);
      return Effect.succeed('conflict' as TaskStatus);
    })
  );
}

function checkTaskWithTiming(
  task: Task,
  cwd: string,
  profile: ProjectProfile
): Effect.Effect<[string, TaskStatus, number], never> {
  return Effect.gen(function* () {
    const start = performance.now();
    const status = yield* checkTask(task, cwd, profile);
    const duration = performance.now() - start;
    return [task.id, status, duration] as [string, TaskStatus, number];
  });
}

function runConcurrent<T>(
  tasks: Array<Task>,
  makeEffect: (task: Task) => Effect.Effect<T, never>
): Promise<Array<T>> {
  return Effect.runPromise(
    Effect.all(tasks.map(makeEffect), { concurrency: CONCURRENCY })
  );
}

export function resolveTaskStatuses(
  tasks: Array<Task>,
  cwd: string,
  profile: ProjectProfile
): Promise<Map<string, TaskStatus>> {
  return runConcurrent(tasks, (task) =>
    checkTask(task, cwd, profile).pipe(
      Effect.map((status) => [task.id, status] as [string, TaskStatus])
    )
  ).then((entries) => new Map(entries));
}

async function resolveStatusesWithTiming(
  tasks: Array<Task>,
  cwd: string,
  profile: ProjectProfile
): Promise<{ statuses: Map<string, TaskStatus>; checkSumMs: number }> {
  const results = await runConcurrent(tasks, (task) =>
    checkTaskWithTiming(task, cwd, profile)
  );
  const statuses = new Map(
    results.map(([id, status]) => [id, status] as [string, TaskStatus])
  );
  const checkSumMs = results.reduce((sum, [, , duration]) => sum + duration, 0);
  return { checkSumMs, statuses };
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
  const { statuses, checkSumMs } = await resolveStatusesWithTiming(
    applicableTasks,
    cwd,
    profile
  );
  const resolutionMs = performance.now() - resolutionStart;

  return {
    profile,
    statuses,
    tasks: applicableTasks,
    timing: { detectionMs, resolutionMs, resolutionSumMs: checkSumMs },
  };
}
