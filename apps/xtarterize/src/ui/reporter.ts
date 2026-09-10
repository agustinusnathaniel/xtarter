import type { PreflightError, Task, TaskStatus } from '@xtarterize/core';
import { logError, logInfo, logSuccess, pc } from '@xtarterize/core';

import type { SessionOutcome } from '@/session.js';
import type { RuntimeContext } from '@/utils/runtime.js';
import { formatTimingJson, printTiming } from '@/utils/timing-display.js';

import { type DisplayFormat, displayDiffs } from './diff-display.js';
import { formatRunResult } from './json-formatter.js';
import { displayPlan } from './plan-display.js';

function reportApply(outcome: SessionOutcome, runtime: RuntimeContext): void {
  if (runtime.format === 'json') {
    console.log(
      formatRunResult({
        applied: outcome.applied,
        errors: outcome.errors,
        ok: outcome.ok,
        skipped: outcome.skipped,
        status: outcome.taskStatus,
        taskId: outcome.taskId,
        timing: outcome.recordTiming
          ? formatTimingJson(outcome.timing, outcome.applyTiming)
          : undefined,
      })
    );
    return;
  }

  console.log('');
  logSuccess(`Applied ${outcome.applied} tasks`);
  if (outcome.errors.length > 0) {
    logError(`${outcome.errors.length} errors`);
    for (const error of outcome.errors) {
      logError(`  - ${error}`);
    }
  }
  if (!runtime.quiet) {
    printTiming(outcome.timing, outcome.applyTiming, {
      recordTiming: outcome.recordTiming,
    });
  }
}

function reportDryRun(outcome: SessionOutcome, runtime: RuntimeContext): void {
  for (const error of outcome.errors) {
    logError(`Failed to dryRun ${error}`);
  }
  const failures = outcome.dryRunFailures ?? 0;
  if (runtime.format === 'json') {
    displayDiffs(outcome.diffs, 'json', failures);
    return;
  }
  displayDiffs(outcome.diffs, 'terminal', failures);
  if (!runtime.quiet) {
    printTiming(outcome.timing);
  }
}

function reportEmpty(outcome: SessionOutcome, runtime: RuntimeContext): void {
  if (runtime.format === 'json') {
    console.log(
      formatRunResult({
        applied: 0,
        errors: outcome.errors,
        ok: outcome.ok,
        skipped: outcome.skipped,
        status: outcome.taskStatus,
        taskId: outcome.taskId,
      })
    );
    return;
  }
  if (outcome.ok) {
    logSuccess(outcome.message ?? '');
  } else {
    logError(outcome.message ?? '');
  }
  if (!runtime.quiet) {
    printTiming(outcome.timing);
  }
}

function reportBlocked(outcome: SessionOutcome, runtime: RuntimeContext): void {
  if (runtime.format === 'json') {
    console.log(
      formatRunResult({
        applied: 0,
        errors: outcome.errors,
        ok: false,
        skipped: 0,
        status: outcome.taskStatus,
        taskId: outcome.taskId,
      })
    );
    return;
  }
  for (const error of outcome.errors) {
    logError(error);
  }
  if (outcome.hint) {
    logInfo(outcome.hint);
  }
}

/** Render a session outcome to the terminal or as a JSON payload. */
export function reportSessionOutcome(
  outcome: SessionOutcome,
  runtime: RuntimeContext
): void {
  switch (outcome.kind) {
    case 'apply':
      reportApply(outcome, runtime);
      return;
    case 'blocked':
      reportBlocked(outcome, runtime);
      return;
    case 'dry-run':
      reportDryRun(outcome, runtime);
      return;
    case 'empty':
      reportEmpty(outcome, runtime);
      return;
    case 'cancelled':
      logInfo(outcome.message ?? 'Cancelled');
      return;
  }
}

/** Render the actionable plan unless the runtime is quiet. */
export function reportPlan(
  tasks: Array<Task>,
  statuses: Map<string, TaskStatus>,
  runtime: RuntimeContext
): void {
  if (runtime.quiet) {
    return;
  }
  displayPlan(tasks, statuses);
}

/** Render a preflight failure as human text or a JSON failure payload. */
export function reportPreflightFailure(
  errors: Array<PreflightError>,
  format: DisplayFormat
): void {
  if (format === 'json') {
    console.log(JSON.stringify({ errors, ok: false }));
    return;
  }

  console.log('');
  console.log(`${pc.red('✖')} Preflight checks failed`);
  console.log('');
  for (const error of errors) {
    console.log(`${pc.red(`  ✗ ${error.message}`)}`);
    if (error.hint) {
      console.log(`  ${pc.dim(error.hint)}`);
    }
  }
  console.log('');
}
