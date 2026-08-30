import { confirm } from '@clack/prompts';
import type {
  ApplyTiming,
  ProjectProfile,
  Task,
  TaskStatus,
} from '@xtarterize/core';
import {
  abortIfCancelled,
  applyTasks,
  createSpinner,
  logError,
  logInfo,
  logSuccess,
  logWarn,
  resolveTaskStatuses,
} from '@xtarterize/core';

import { type DisplayFormat, displayDiffs } from '@/ui/diff-display.js';
import { formatRunResult } from '@/ui/json-formatter.js';
import { detectionOnlyTiming, printTiming } from '@/utils/timing-display.js';

import { selectTasksGrouped } from './selection.js';
import type { RunInteractiveOptions, TaskWithStatus } from './types.js';

function handleNoApplicable(options: { jsonMode: boolean }): boolean {
  if (options.jsonMode) {
    console.log(
      formatRunResult({ applied: 0, errors: [], ok: true, skipped: 0 })
    );
  } else {
    logInfo('No tasks applicable for this project');
  }
  return true;
}

function createWrappedTasks(options: {
  tasks: Array<Task>;
  jsonMode: boolean;
  checkErrors: Array<string>;
}): Array<Task> {
  return options.tasks.map((task) => ({
    ...task,
    check: async (cwd: string, p: ProjectProfile): Promise<TaskStatus> => {
      try {
        return await task.check(cwd, p);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const detail = `Failed to check ${task.id}: ${message}`;
        options.checkErrors.push(detail);
        if (!options.jsonMode) {
          logError(detail);
        }
        process.exitCode = 1;
        return 'conflict';
      }
    },
  }));
}

function buildTasksWithStatus(options: {
  tasks: Array<Task>;
  statuses: Map<string, TaskStatus>;
}): Array<TaskWithStatus> {
  return options.tasks.map((task) => ({
    status: options.statuses.get(task.id) ?? 'new',
    task,
  }));
}

function handleQuietNoSelection(options: {
  jsonMode: boolean;
  checkErrors: Array<string>;
}): boolean {
  const { jsonMode, checkErrors } = options;
  if (jsonMode) {
    console.log(
      formatRunResult({
        applied: 0,
        errors: checkErrors,
        ok: checkErrors.length === 0,
        skipped: 0,
      })
    );
  } else {
    logInfo('Interactive mode requires a terminal. Use a task ID instead.');
  }
  return true;
}

async function getSelectedIds(options: {
  allFlag: boolean | undefined;
  tasksWithStatus: Array<TaskWithStatus>;
  includeConflicts: boolean;
}): Promise<Array<string>> {
  if (options.allFlag) {
    return options.tasksWithStatus
      .filter(
        (t) =>
          t.status === 'new' ||
          t.status === 'patch' ||
          (options.includeConflicts && t.status === 'conflict')
      )
      .map((t) => t.task.id);
  }
  return selectTasksGrouped(options.tasksWithStatus);
}

function handleEmptySelection(options: {
  jsonMode: boolean;
  checkErrors: Array<string>;
}): boolean {
  if (options.jsonMode) {
    console.log(
      formatRunResult({
        applied: 0,
        errors: options.checkErrors,
        ok: options.checkErrors.length === 0,
        skipped: 0,
      })
    );
  } else {
    logInfo('No tasks to apply');
  }
  return true;
}

async function applyAllTasks(options: {
  selectedTasks: Array<TaskWithStatus>;
  cwd: string;
  profile: ProjectProfile;
  includeConflicts: boolean;
  jsonMode: boolean;
  statuses: Map<string, TaskStatus>;
}): Promise<{
  applied: number;
  errors: Array<string>;
  timing: ApplyTiming | undefined;
}> {
  const { selectedTasks, cwd, profile, includeConflicts, jsonMode, statuses } =
    options;
  const result = await applyTasks({
    cwd,
    includeConflicts,
    profile,
    quiet: true,
    statuses,
    tasks: selectedTasks.map((e) => e.task),
  });
  if (!jsonMode) {
    for (const error of result.errors) {
      logError(error);
    }
  }
  return {
    applied: result.applied,
    errors: [...result.errors],
    timing: result.timing,
  };
}

async function confirmTaskApply(label: string): Promise<boolean> {
  const proceed = await confirm({ message: `Apply ${label}?` });
  abortIfCancelled(proceed, 'Add cancelled');
  return Boolean(proceed);
}

async function applyOneInteractiveTask(options: {
  entry: TaskWithStatus;
  cwd: string;
  profile: ProjectProfile;
  format: DisplayFormat;
  jsonMode: boolean;
  includeConflicts: boolean;
  statuses: Map<string, TaskStatus>;
}): Promise<{
  appliedDelta: number;
  errors: Array<string>;
  timing: ApplyTiming | undefined;
}> {
  const diffs = await options.entry.task.dryRun(options.cwd, options.profile);
  if (!options.jsonMode) {
    displayDiffs(diffs, options.format);
  }
  const proceed = await confirmTaskApply(options.entry.task.label);
  if (!proceed) {
    return { appliedDelta: 0, errors: [], timing: undefined };
  }
  const result = await applyTasks({
    cwd: options.cwd,
    includeConflicts: options.includeConflicts,
    profile: options.profile,
    quiet: true,
    selectedIds: [options.entry.task.id],
    statuses: options.statuses,
    tasks: [options.entry.task],
  });
  if (result.applied > 0) {
    if (!options.jsonMode) {
      logSuccess(`${options.entry.task.id} applied`);
    }
    return { appliedDelta: 1, errors: [], timing: result.timing };
  }
  if (result.errors.length > 0) {
    if (!options.jsonMode) {
      logError(`${options.entry.task.id}: ${result.errors.join(', ')}`);
    }
    return {
      appliedDelta: 0,
      errors: [...result.errors],
      timing: result.timing,
    };
  }
  if (!options.jsonMode) {
    logWarn(
      `${options.entry.task.id} skipped (${options.entry.status}) - not applied`
    );
  }
  return { appliedDelta: 0, errors: [], timing: result.timing };
}

async function applyInteractively(options: {
  selectedTasks: Array<TaskWithStatus>;
  cwd: string;
  profile: ProjectProfile;
  format: DisplayFormat;
  jsonMode: boolean;
  includeConflicts: boolean;
  statuses: Map<string, TaskStatus>;
}): Promise<{
  applied: number;
  errors: Array<string>;
  timing: ApplyTiming | undefined;
}> {
  let applied = 0;
  const errors: Array<string> = [];
  let timing: ApplyTiming | undefined;
  for (const entry of options.selectedTasks) {
    const r = await applyOneInteractiveTask({
      cwd: options.cwd,
      entry,
      format: options.format,
      includeConflicts: options.includeConflicts,
      jsonMode: options.jsonMode,
      profile: options.profile,
      statuses: options.statuses,
    });
    applied += r.appliedDelta;
    errors.push(...r.errors);
    if (r.timing) {
      timing = r.timing;
    }
  }
  return { applied, errors, timing };
}

function maybeWarnConflictsSkipped(options: {
  allFlag: boolean | undefined;
  jsonMode: boolean;
  includeConflicts: boolean;
  tasksWithStatus: Array<TaskWithStatus>;
}): void {
  if (
    options.allFlag &&
    !options.jsonMode &&
    !options.includeConflicts &&
    options.tasksWithStatus.some((t) => t.status === 'conflict')
  ) {
    logWarn(
      'Conflicting tasks skipped. Pass --include-conflicts to apply them anyway.'
    );
  }
}

function outputJsonResult(options: {
  allErrors: Array<string>;
  checkErrors: Array<string>;
  applied: number;
  selectedCount: number;
}): void {
  console.log(
    formatRunResult({
      applied: options.applied,
      errors: [...options.checkErrors, ...options.allErrors],
      ok: options.allErrors.length === 0 && options.checkErrors.length === 0,
      skipped: options.selectedCount - options.applied,
    })
  );
  if (options.allErrors.length > 0 || options.checkErrors.length > 0) {
    process.exitCode = 1;
  }
}

function outputHumanSummary(options: {
  allErrors: Array<string>;
  checkErrors: Array<string>;
  applied: number;
  selectedCount: number;
  quiet: boolean;
  detectionMs: number;
  timing: ApplyTiming | undefined;
  recordTiming: boolean;
}): void {
  console.log('');
  if (options.allErrors.length > 0 || options.checkErrors.length > 0) {
    logError(
      `${options.allErrors.length + options.checkErrors.length} error(s)`
    );
    process.exitCode = 1;
  }
  logSuccess(`${options.applied}/${options.selectedCount} tasks applied`);
  if (!options.quiet && options.timing) {
    printTiming(detectionOnlyTiming(options.detectionMs), options.timing, {
      recordTiming: options.recordTiming,
    });
  }
}

async function resolveStatusesWithSpinner(options: {
  applicable: Array<Task>;
  cwd: string;
  profile: ProjectProfile;
  quiet: boolean;
  jsonMode: boolean;
  checkErrors: Array<string>;
}): Promise<{
  statuses: Map<string, TaskStatus>;
  tasksWithStatus: Array<TaskWithStatus>;
}> {
  const spinner = createSpinner(options.quiet);
  spinner.start('Checking task statuses...');
  const wrapped = createWrappedTasks({
    checkErrors: options.checkErrors,
    jsonMode: options.jsonMode,
    tasks: options.applicable,
  });
  const statuses = await resolveTaskStatuses(
    wrapped,
    options.cwd,
    options.profile
  );
  const tasksWithStatus = buildTasksWithStatus({
    statuses,
    tasks: options.applicable,
  });
  spinner.stop('Tasks checked');
  return { statuses, tasksWithStatus };
}

async function executeSelectedTasks(options: {
  selectedTasks: Array<TaskWithStatus>;
  allFlag: boolean | undefined;
  cwd: string;
  profile: ProjectProfile;
  format: DisplayFormat;
  jsonMode: boolean;
  includeConflicts: boolean;
  statuses: Map<string, TaskStatus>;
}): Promise<{
  applied: number;
  errors: Array<string>;
  timing: ApplyTiming | undefined;
}> {
  if (options.allFlag) {
    return applyAllTasks({
      cwd: options.cwd,
      includeConflicts: options.includeConflicts,
      jsonMode: options.jsonMode,
      profile: options.profile,
      selectedTasks: options.selectedTasks,
      statuses: options.statuses,
    });
  }
  return applyInteractively({
    cwd: options.cwd,
    format: options.format,
    includeConflicts: options.includeConflicts,
    jsonMode: options.jsonMode,
    profile: options.profile,
    selectedTasks: options.selectedTasks,
    statuses: options.statuses,
  });
}

async function getValidatedSelection(options: {
  allFlag: boolean | undefined;
  tasksWithStatus: Array<TaskWithStatus>;
  includeConflicts: boolean;
  jsonMode: boolean;
  checkErrors: Array<string>;
}): Promise<Array<TaskWithStatus> | null> {
  const selectedIds = await getSelectedIds({
    allFlag: options.allFlag,
    includeConflicts: options.includeConflicts,
    tasksWithStatus: options.tasksWithStatus,
  });
  if (selectedIds.length === 0) {
    handleEmptySelection({
      checkErrors: options.checkErrors,
      jsonMode: options.jsonMode,
    });
    return null;
  }
  return options.tasksWithStatus.filter((e) => selectedIds.includes(e.task.id));
}

function finalizeInteractiveOutput(options: {
  result: {
    applied: number;
    errors: Array<string>;
    timing: ApplyTiming | undefined;
  };
  checkErrors: Array<string>;
  selectedCount: number;
  jsonMode: boolean;
  allFlag: boolean | undefined;
  includeConflicts: boolean;
  tasksWithStatus: Array<TaskWithStatus>;
  quiet: boolean;
  detectionMs: number;
  recordTiming: boolean;
}): void {
  maybeWarnConflictsSkipped({
    allFlag: options.allFlag,
    includeConflicts: options.includeConflicts,
    jsonMode: options.jsonMode,
    tasksWithStatus: options.tasksWithStatus,
  });
  if (options.jsonMode) {
    outputJsonResult({
      allErrors: options.result.errors,
      applied: options.result.applied,
      checkErrors: options.checkErrors,
      selectedCount: options.selectedCount,
    });
    return;
  }
  outputHumanSummary({
    allErrors: options.result.errors,
    applied: options.result.applied,
    checkErrors: options.checkErrors,
    detectionMs: options.detectionMs,
    quiet: options.quiet,
    recordTiming: options.recordTiming,
    selectedCount: options.selectedCount,
    timing: options.result.timing,
  });
}

export async function runInteractive(
  options: RunInteractiveOptions
): Promise<void> {
  const {
    allTasks,
    profile,
    cwd,
    quiet,
    format,
    detectionMs,
    recordTiming,
    all: allFlag,
    includeConflicts,
  } = options;
  const jsonMode = format === 'json';
  const applicable = allTasks.filter((t) => t.applicable(profile));
  if (applicable.length === 0) {
    handleNoApplicable({ jsonMode });
    return;
  }
  const checkErrors: Array<string> = [];
  const { statuses, tasksWithStatus } = await resolveStatusesWithSpinner({
    applicable,
    checkErrors,
    cwd,
    jsonMode,
    profile,
    quiet,
  });
  if (quiet && !allFlag) {
    handleQuietNoSelection({ checkErrors, jsonMode });
    return;
  }
  const selectedTasks = await getValidatedSelection({
    allFlag,
    checkErrors,
    includeConflicts,
    jsonMode,
    tasksWithStatus,
  });
  if (!selectedTasks) {
    return;
  }
  const result = await executeSelectedTasks({
    allFlag,
    cwd,
    format,
    includeConflicts,
    jsonMode,
    profile,
    selectedTasks,
    statuses,
  });
  finalizeInteractiveOutput({
    allFlag,
    checkErrors,
    detectionMs,
    includeConflicts,
    jsonMode,
    quiet,
    recordTiming,
    result,
    selectedCount: selectedTasks.length,
    tasksWithStatus,
  });
}
