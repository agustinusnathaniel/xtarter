import type { Task, TaskStatus } from '@/_base.js';
import type { ProjectProfile } from '@/detect.js';
import { detectProject } from '@/detect.js';
import type { ResolveTiming } from '@/timing.js';
import { logWarn } from '@/utils/logger.js';

export const CONCURRENCY = 8;

/**
 * Map over `items` with at most `limit` callbacks in flight at once.
 * Results keep the input order regardless of completion order.
 */
export async function mapWithConcurrency<T, R>(
  items: ReadonlyArray<T>,
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<Array<R>> {
  const results = new Array<R>(items.length);
  const workerCount = Math.min(items.length, Math.max(1, limit));
  let nextIndex = 0;
  const workers = Array.from({ length: workerCount }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

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

async function runCheckTask(
  task: Task,
  cwd: string,
  profile: ProjectProfile
): Promise<CheckOutcome> {
  try {
    return { status: await task.check(cwd, profile) };
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    logWarn(`Failed to check ${task.id}: ${detail}`);
    return { checkError: detail, status: 'conflict' };
  }
}

export function collectTaskChecks(options: {
  cwd: string;
  profile: ProjectProfile;
  statuses?: ReadonlyMap<string, TaskStatus>;
  tasks: Array<Task>;
}): Promise<Array<TaskCheckResult>> {
  const { cwd, profile, statuses, tasks } = options;
  return mapWithConcurrency(
    tasks,
    CONCURRENCY,
    async (task): Promise<TaskCheckResult> => {
      const precomputed = statuses?.get(task.id);
      if (precomputed !== undefined) {
        return {
          checkMs: 0,
          status: precomputed,
          task,
        };
      }
      const start = performance.now();
      const outcome = await runCheckTask(task, cwd, profile);
      return {
        checkMs: performance.now() - start,
        task,
        ...outcome,
      };
    }
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
  allTasks: Array<Task>
): Promise<{
  checkErrors: Map<string, string>;
  profile: ProjectProfile;
  tasks: Array<Task>;
  statuses: Map<string, TaskStatus>;
  timing: ResolveTiming;
}> {
  const detectionStart = performance.now();
  const profile = await detectProject(cwd);
  const detectionMs = performance.now() - detectionStart;

  const applicableTasks = resolveTasks(profile, allTasks);

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
}
