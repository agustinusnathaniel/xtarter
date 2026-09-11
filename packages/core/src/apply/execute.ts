import { spinner } from '@clack/prompts';
import { Cause, Effect, Exit } from 'effect';

import type { TaskServices } from '@/_base.js';
import { backupFile, writeRunManifest } from '@/backup.js';
import type { ProjectProfile } from '@/detect.js';
import type { BackupError } from '@/errors.js';
import { failureDetail } from '@/resolve.js';
import { DepsInstaller } from '@/services/deps-installer.js';
import { toTaskEffect } from '@/task-effect.js';
import type { ApplyTiming } from '@/timing.js';
import { logError, pc } from '@/utils/logger.js';
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

function liftBackup<A>(run: () => Promise<A>): Effect.Effect<A, BackupError> {
  return Effect.tryPromise({
    catch: (cause) => cause as BackupError,
    try: run,
  });
}

function backupPlanFiles(
  cwd: string,
  files: Array<string>
): Effect.Effect<void, BackupError> {
  return Effect.gen(function* () {
    yield* Effect.forEach(
      files,
      (filepath) => liftBackup(() => backupFile(cwd, filepath)),
      {
        discard: true,
      }
    );
    if (files.length > 0) {
      yield* liftBackup(() => writeRunManifest(cwd, files));
    }
  });
}

function installPlanDependencies(options: {
  cwd: string;
  dependencies: ApplyPlan['dependencies'];
  quiet: boolean;
}): Effect.Effect<Array<string>, never, DepsInstaller> {
  const { cwd, dependencies, quiet } = options;
  return Effect.gen(function* () {
    if (dependencies.length === 0) {
      return [];
    }
    const installer = yield* DepsInstaller;
    const exit = yield* Effect.exit(
      installer.install(cwd, dependencies, { silent: quiet })
    );
    if (Exit.isSuccess(exit)) {
      return [];
    }
    if (Cause.hasInterruptsOnly(exit.cause)) {
      return yield* Effect.interrupt;
    }
    return [
      `Failed to batch-install dependencies: ${failureDetail(exit.cause)}`,
    ];
  });
}

function applyPendingEntries(options: {
  cwd: string;
  entries: Array<ApplyPlanEntry>;
  perTask: ApplyTiming['tasks'];
  profile: ProjectProfile;
  spinnerInstance: SpinnerInstance;
}): Effect.Effect<
  { applied: number; errors: Array<string> },
  never,
  TaskServices
> {
  const { cwd, entries, perTask, profile, spinnerInstance } = options;
  return Effect.gen(function* () {
    let applied = 0;
    const errors: Array<string> = [];

    for (const entry of entries) {
      const taskApplyStart = performance.now();
      yield* Effect.sync(() =>
        spinnerInstance?.start(`Applying ${entry.task.label}`)
      );
      const exit = yield* Effect.exit(
        toTaskEffect(entry.task.id, 'apply', () =>
          entry.task.apply(cwd, profile)
        )
      );
      if (Exit.isSuccess(exit)) {
        const timing = perTask.find((t) => t.id === entry.task.id);
        if (timing) {
          timing.applyMs = performance.now() - taskApplyStart;
        }
        applied += 1;
        yield* Effect.sync(() =>
          spinnerInstance?.stop(
            `${statusTag(entry.status)} ${entry.task.label}`
          )
        );
        continue;
      }
      if (Cause.hasInterruptsOnly(exit.cause)) {
        yield* Effect.sync(() => spinnerInstance?.stop());
        return yield* Effect.interrupt;
      }
      const message = failureDetail(exit.cause);
      entry.applyError = message;
      errors.push(`${entry.task.id}: ${message}`);
      yield* Effect.sync(() => {
        if (spinnerInstance) {
          spinnerInstance.stop(
            `${pc.red('✗')} ${entry.task.label} - ${message}`
          );
        } else {
          logError(`Failed to apply ${entry.task.id}: ${message}`);
        }
      });
    }

    return { applied, errors };
  });
}

export function executePlan(
  options: ExecutePlanOptions
): Effect.Effect<ApplyResult, BackupError, DepsInstaller | TaskServices> {
  const { cwd, plan, profile, quiet = false } = options;
  return Effect.acquireUseRelease(
    Effect.sync(() => (quiet ? null : spinner())),
    (spinnerInstance) =>
      Effect.gen(function* () {
        const applyStart = performance.now();
        const { perTask, tasksToRun } = buildTiming(plan);
        const errors = collectDryRunErrors(plan);

        yield* backupPlanFiles(cwd, plan.files);
        errors.push(
          ...(yield* installPlanDependencies({
            cwd,
            dependencies: plan.dependencies,
            quiet,
          }))
        );

        const pending = yield* applyPendingEntries({
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
      }),
    (spinnerInstance) => Effect.sync(() => spinnerInstance?.stop())
  );
}
