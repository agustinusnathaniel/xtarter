import { spinner } from '@clack/prompts';
import { Effect } from 'effect';

import { backupFile, writeRunManifest } from '@/backup.js';
import type { ProjectProfile } from '@/detect.js';
import { TaskError } from '@/errors.js';
import type { ApplyTiming } from '@/timing.js';
import { logError, pc } from '@/utils/logger.js';
import { installDependenciesBatch } from '@/utils/pkg.js';
import { statusTag } from '@/utils/tags.js';

import type { ApplyPlan, ApplyPlanEntry } from './plan.js';

export interface ApplyResult {
  applied: number;
  errors: Array<string>;
  skipped: number;
  timing?: ApplyTiming;
}

export interface ExecutePlanOptions {
  cwd: string;
  plan: ApplyPlan;
  profile: ProjectProfile;
  quiet?: boolean;
}

type SpinnerInstance = ReturnType<typeof spinner> | null;

function formatFailure(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function collectDryRunErrors(plan: ApplyPlan): Array<string> {
  const errors: Array<string> = [];
  for (const entry of plan.entries) {
    if (entry.dryRunError) {
      logError(`Failed to check/dryRun ${entry.dryRunError}`);
      errors.push(entry.dryRunError);
    }
  }
  return errors;
}

function buildTiming(plan: ApplyPlan): {
  perTask: ApplyTiming['tasks'];
  tasksToRun: Array<ApplyPlanEntry>;
} {
  const perTask: ApplyTiming['tasks'] = [];
  for (const entry of plan.entries) {
    if (entry.skipped) {
      perTask.push({
        checkMs: entry.checkMs,
        id: entry.task.id,
        label: entry.task.label,
      });
    }
  }

  const tasksToRun: Array<ApplyPlanEntry> = [];
  for (const entry of plan.entries) {
    if (entry.skipped || entry.dryRunError) {
      continue;
    }
    perTask.push({
      checkMs: entry.checkMs,
      dryRunMs: entry.dryRunMs,
      id: entry.task.id,
      label: entry.task.label,
    });
    tasksToRun.push(entry);
  }

  return { perTask, tasksToRun };
}

async function backupPlanFiles(
  cwd: string,
  files: Array<string>
): Promise<void> {
  for (const filepath of files) {
    await backupFile(cwd, filepath);
  }
  if (files.length > 0) {
    await writeRunManifest(cwd, files);
  }
}

async function installPlanDependencies(options: {
  cwd: string;
  dependencies: ApplyPlan['dependencies'];
  quiet: boolean;
}): Promise<Array<string>> {
  const { cwd, dependencies, quiet } = options;
  if (dependencies.length === 0) {
    return [];
  }
  try {
    await installDependenciesBatch(cwd, dependencies, { silent: quiet });
    return [];
  } catch (error) {
    return [`Failed to batch-install dependencies: ${formatFailure(error)}`];
  }
}

async function applyPendingEntries(options: {
  cwd: string;
  entries: Array<ApplyPlanEntry>;
  perTask: ApplyTiming['tasks'];
  profile: ProjectProfile;
  spinnerInstance: SpinnerInstance;
}): Promise<{ applied: number; errors: Array<string> }> {
  const { cwd, entries, perTask, profile, spinnerInstance } = options;
  let applied = 0;
  const errors: Array<string> = [];

  for (const entry of entries) {
    try {
      const taskApplyStart = performance.now();
      spinnerInstance?.start(`Applying ${entry.task.label}`);
      await Effect.runPromise(
        Effect.tryPromise({
          catch: (cause) => {
            const causeMsg =
              cause instanceof Error ? cause.message : String(cause);
            return new TaskError({
              cause,
              message: causeMsg,
              taskId: entry.task.id,
            });
          },
          try: (_signal) => entry.task.apply(cwd, profile),
        })
      );
      const timing = perTask.find((t) => t.id === entry.task.id);
      if (timing) {
        timing.applyMs = performance.now() - taskApplyStart;
      }
      applied += 1;
      spinnerInstance?.stop(`${statusTag(entry.status)} ${entry.task.label}`);
    } catch (error) {
      const message = formatFailure(error);
      entry.applyError = message;
      errors.push(`${entry.task.id}: ${message}`);
      if (spinnerInstance) {
        spinnerInstance.stop(`${pc.red('✗')} ${entry.task.label} - ${message}`);
      } else {
        logError(`Failed to apply ${entry.task.id}: ${message}`);
      }
    }
  }

  return { applied, errors };
}

export async function executePlan(
  options: ExecutePlanOptions
): Promise<ApplyResult> {
  const { cwd, plan, profile, quiet = false } = options;
  const applyStart = performance.now();
  const spinnerInstance = quiet ? null : spinner();
  const { perTask, tasksToRun } = buildTiming(plan);
  const errors = collectDryRunErrors(plan);

  await backupPlanFiles(cwd, plan.files);
  errors.push(
    ...(await installPlanDependencies({
      cwd,
      dependencies: plan.dependencies,
      quiet,
    }))
  );

  const pending = await applyPendingEntries({
    cwd,
    entries: tasksToRun,
    perTask,
    profile,
    spinnerInstance,
  });
  errors.push(...pending.errors);

  if (!quiet) {
    console.log('');
  }
  return {
    applied: pending.applied,
    errors,
    skipped: plan.entries.filter((entry) => entry.skipped).length,
    timing: { applyMs: performance.now() - applyStart, tasks: perTask },
  };
}
