import { Effect } from 'effect';

import type { Task, TaskStatus } from '@/_base.js';
import type { ProjectProfile } from '@/detect.js';
import { TaskError } from '@/errors.js';
import type { TaskTiming } from '@/timing.js';
import { logError } from '@/utils/logger.js';

const CONCURRENCY = 8;

export type DryRunSuccess = {
  kind: 'success';
  task: Task;
  status: TaskStatus;
  checkMs: number;
  dryRunMs: number;
  diffs: Array<{ filepath: string }>;
};

export type DryRunFailure = {
  kind: 'failure';
  task: Task;
  checkMs: number;
  errorMsg: string;
};

export type DryRunOutcome = DryRunSuccess | DryRunFailure;

export function collectDryRunOutcomes(
  toDryRun: Array<{ task: Task; status: TaskStatus; checkMs: number }>,
  cwd: string,
  profile: ProjectProfile
): Promise<Array<DryRunOutcome>> {
  return Effect.runPromise(
    Effect.all(
      toDryRun.map(({ task, status, checkMs }) =>
        Effect.gen(function* () {
          const start = performance.now();
          const diffs = yield* Effect.tryPromise({
            catch: (cause) =>
              new TaskError({
                cause,
                message: `Failed to dryRun ${task.id}`,
                taskId: task.id,
              }),
            try: () => task.dryRun(cwd, profile),
          });
          const dryRunMs = performance.now() - start;
          return {
            checkMs,
            diffs,
            dryRunMs,
            kind: 'success' as const,
            status,
            task,
          };
        }).pipe(
          Effect.catch((error: unknown) =>
            Effect.sync(() => {
              const message =
                error instanceof Error ? error.message : String(error);
              logError(`Failed to check/dryRun ${task.id}: ${message}`);
              return {
                checkMs,
                errorMsg: `${task.id}: ${message}`,
                kind: 'failure' as const,
                task,
              };
            })
          )
        )
      ),
      { concurrency: CONCURRENCY }
    )
  );
}

export function processDryRunOutcomes(
  dryRunOutcomes: Array<DryRunOutcome>,
  perTask: Array<TaskTiming>
): {
  tasksToRun: Array<{ task: Task; status: TaskStatus }>;
  filesToBackup: Set<string>;
  checkErrors: Array<string>;
} {
  const tasksToRun: Array<{ task: Task; status: TaskStatus }> = [];
  const filesToBackup = new Set<string>();
  const checkErrors: Array<string> = [];

  for (const outcome of dryRunOutcomes) {
    if (outcome.kind === 'failure') {
      checkErrors.push(outcome.errorMsg);
      continue;
    }
    for (const diff of outcome.diffs) {
      filesToBackup.add(diff.filepath);
    }
    tasksToRun.push({ status: outcome.status, task: outcome.task });
    perTask.push({
      checkMs: outcome.checkMs,
      dryRunMs: outcome.dryRunMs,
      id: outcome.task.id,
      label: outcome.task.label,
    });
  }

  return { checkErrors, filesToBackup, tasksToRun };
}
