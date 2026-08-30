import { Effect } from 'effect';

import type { Task, TaskStatus } from '@/_base.js';
import { backupFile, writeRunManifest } from '@/backup.js';
import type { ProjectProfile } from '@/detect.js';
import { TaskError } from '@/errors.js';
import type { TaskTiming } from '@/timing.js';
import { logError, pc } from '@/utils/logger.js';
import { installDependenciesBatch } from '@/utils/pkg.js';
import { statusTag } from '@/utils/tags.js';

const CONCURRENCY = 8;

type Spinner = {
  start: (msg: string) => void;
  stop: (msg: string, code?: number) => void;
} | null;

export async function backupAndManifest(
  cwd: string,
  filesToBackup: Set<string>
): Promise<void> {
  for (const filepath of filesToBackup) {
    await backupFile(cwd, filepath);
  }
  if (filesToBackup.size > 0) {
    await writeRunManifest(cwd, [...filesToBackup]);
  }
}

export async function collectAndInstallDeps(options: {
  cwd: string;
  profile: ProjectProfile;
  tasksToRun: Array<{ task: Task; status: TaskStatus }>;
  quiet: boolean;
}): Promise<void> {
  const { cwd, profile, tasksToRun, quiet } = options;
  const depArrays = await Effect.runPromise(
    Effect.all(
      tasksToRun.map(({ task }) =>
        Effect.promise(() =>
          task.getDeps
            ? task.getDeps(cwd, profile)
            : Promise.resolve([] as Array<{ depName: string; dev: boolean }>)
        )
      ),
      { concurrency: CONCURRENCY }
    )
  );
  const allDeps = depArrays.flat();
  if (allDeps.length === 0) {
    return;
  }
  try {
    await installDependenciesBatch(cwd, allDeps, { silent: quiet });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError(`Failed to batch-install dependencies: ${message}`);
  }
}

function findTimingEntry(
  perTask: Array<TaskTiming>,
  id: string
): TaskTiming | undefined {
  return perTask.find((t) => t.id === id);
}

function formatApplyFailure(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function executeApplyTasks(options: {
  tasksToRun: Array<{ task: Task; status: TaskStatus }>;
  cwd: string;
  profile: ProjectProfile;
  perTask: Array<TaskTiming>;
  spinner: Spinner;
}): Promise<{ applied: number; errors: Array<string> }> {
  const { tasksToRun, cwd, profile, perTask, spinner } = options;
  let applied = 0;
  const errors: Array<string> = [];

  for (const { task, status } of tasksToRun) {
    try {
      const applyStart = performance.now();
      spinner?.start(`Applying ${task.label}`);
      await Effect.runPromise(
        Effect.tryPromise({
          catch: (cause) => {
            const causeMsg =
              cause instanceof Error ? cause.message : String(cause);
            return new TaskError({
              cause,
              message: causeMsg,
              taskId: task.id,
            });
          },
          try: (_signal) => task.apply(cwd, profile),
        })
      );
      const applyMs = performance.now() - applyStart;
      applied++;
      const entry = findTimingEntry(perTask, task.id);
      if (entry) {
        entry.applyMs = applyMs;
      }
      spinner?.stop(`${statusTag(status)} ${task.label}`);
    } catch (error) {
      const message = formatApplyFailure(error);
      errors.push(`${task.id}: ${message}`);
      if (spinner) {
        spinner.stop(`${pc.red('✗')} ${task.label} - ${message}`);
      } else {
        logError(`Failed to apply ${task.id}: ${message}`);
      }
    }
  }

  return { applied, errors };
}
