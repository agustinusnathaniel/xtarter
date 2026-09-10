import type { TaskStatus } from '@xtarterize/core';
import { logWarn } from '@xtarterize/core';

import type { CommandSession } from '@/session.js';
import { displayDiffs } from '@/ui/diff-display.js';
import type { Prompter } from '@/ui/prompter.js';

import { selectTasksGrouped } from './selection.js';
import type { RunInteractiveOptions, TaskWithStatus } from './types.js';

function isActionable(status: TaskStatus, includeConflicts: boolean): boolean {
  if (status === 'new' || status === 'patch') {
    return true;
  }
  return includeConflicts && status === 'conflict';
}

function buildTasksWithStatus(session: CommandSession): Array<TaskWithStatus> {
  return session.tasks.map((task) => ({
    status: session.statuses.get(task.id) ?? 'new',
    task,
  }));
}

function warnConflictsSkipped(options: {
  allFlag: boolean | undefined;
  includeConflicts: boolean;
  jsonMode: boolean;
  tasksWithStatus: Array<TaskWithStatus>;
}): void {
  const { allFlag, includeConflicts, jsonMode, tasksWithStatus } = options;
  if (
    allFlag &&
    !jsonMode &&
    !includeConflicts &&
    tasksWithStatus.some((entry) => entry.status === 'conflict')
  ) {
    logWarn(
      'Conflicting tasks skipped. Pass --include-conflicts to apply them anyway.'
    );
  }
}

async function confirmSelected(options: {
  includeConflicts: boolean;
  jsonMode: boolean;
  prompter: Prompter;
  selected: Array<TaskWithStatus>;
  session: CommandSession;
}): Promise<Array<TaskWithStatus> | null> {
  const { includeConflicts, jsonMode, prompter, selected, session } = options;
  const confirmed: Array<TaskWithStatus> = [];

  for (const entry of selected) {
    const plan = await session.plan({
      includeConflicts,
      tasks: [entry.task],
    });
    if (!jsonMode) {
      displayDiffs(plan.entries[0]?.diffs ?? [], session.runtime.format);
    }
    const proceed = await prompter.confirm({
      message: `Apply ${entry.task.label}?`,
    });
    if (proceed === null) {
      return null;
    }
    if (proceed) {
      confirmed.push(entry);
    }
  }

  return confirmed;
}

async function resolveSelection(options: {
  allFlag: boolean | undefined;
  includeConflicts: boolean;
  prompter: Prompter;
  tasksWithStatus: Array<TaskWithStatus>;
}): Promise<Array<TaskWithStatus> | null> {
  const { allFlag, includeConflicts, prompter, tasksWithStatus } = options;
  if (allFlag) {
    return tasksWithStatus.filter((entry) =>
      isActionable(entry.status, includeConflicts)
    );
  }

  const selectedIds = await selectTasksGrouped(tasksWithStatus, prompter);
  if (selectedIds === null) {
    return null;
  }
  return tasksWithStatus.filter((entry) => selectedIds.includes(entry.task.id));
}

function reportEmptyOutcome(session: CommandSession, message: string): void {
  const checkErrors = session.checkErrorMessages;
  session.report(
    checkErrors.length > 0
      ? session.blocked(message, { errors: checkErrors })
      : session.empty(message)
  );
  if (checkErrors.length > 0) {
    process.exitCode = 1;
  }
}

async function executeConfirmed(options: {
  confirmed: Array<TaskWithStatus>;
  includeConflicts: boolean;
  recordTiming: boolean;
  selected: Array<TaskWithStatus>;
  session: CommandSession;
}): Promise<void> {
  const { confirmed, includeConflicts, recordTiming, selected, session } =
    options;
  // One plan for the whole confirmed selection: one backup set and one run
  // manifest, so `undo` restores the entire `add`.
  const plan = await session.plan({
    includeConflicts,
    tasks: confirmed.map((entry) => entry.task),
  });
  const result = await session.execute(plan);
  const outcome = session.outcomeFor(result, {
    includeCheckErrors: true,
    recordTiming,
    skipped: selected.length - result.applied,
  });
  session.report(outcome);
  if (!outcome.ok) {
    process.exitCode = 1;
  }
}

export async function runInteractive(
  options: RunInteractiveOptions
): Promise<void> {
  const {
    all: allFlag,
    includeConflicts,
    prompter,
    recordTiming,
    session,
  } = options;
  const { runtime, tasks } = session;
  const jsonMode = runtime.format === 'json';

  if (tasks.length === 0) {
    session.report(session.empty('No tasks applicable for this project'));
    return;
  }

  const tasksWithStatus = buildTasksWithStatus(session);

  if (runtime.quiet && !allFlag) {
    reportEmptyOutcome(
      session,
      'Interactive mode requires a terminal. Use a task ID instead.'
    );
    return;
  }

  const selected = await resolveSelection({
    allFlag,
    includeConflicts,
    prompter,
    tasksWithStatus,
  });
  if (selected === null) {
    session.report(session.cancelled());
    return;
  }
  if (selected.length === 0) {
    reportEmptyOutcome(session, 'No tasks to apply');
    return;
  }

  warnConflictsSkipped({
    allFlag,
    includeConflicts,
    jsonMode,
    tasksWithStatus,
  });

  const confirmed = allFlag
    ? selected
    : await confirmSelected({
        includeConflicts,
        jsonMode,
        prompter,
        selected,
        session,
      });
  if (confirmed === null) {
    session.report(session.cancelled());
    return;
  }

  await executeConfirmed({
    confirmed,
    includeConflicts,
    recordTiming,
    selected,
    session,
  });
}
