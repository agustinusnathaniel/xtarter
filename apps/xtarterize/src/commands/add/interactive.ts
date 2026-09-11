import type { TaskStatus } from '@xtarterize/core';
import { logWarn } from '@xtarterize/core';
import { Effect } from 'effect';

import type { CommandSession } from '@/session.js';
import { displayDiffs } from '@/ui/diff-display.js';
import { Prompter } from '@/ui/prompter.js';

import { selectTasksGrouped } from './selection.js';
import type {
  AddCommandError,
  AddCommandServices,
  RunInteractiveOptions,
  TaskWithStatus,
} from './types.js';

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

function confirmSelected(options: {
  includeConflicts: boolean;
  jsonMode: boolean;
  selected: Array<TaskWithStatus>;
  session: CommandSession;
}): Effect.Effect<
  Array<TaskWithStatus> | null,
  AddCommandError,
  AddCommandServices
> {
  return Effect.gen(function* () {
    const { includeConflicts, jsonMode, selected, session } = options;
    const prompter = yield* Prompter;
    const confirmed: Array<TaskWithStatus> = [];

    for (const entry of selected) {
      const plan = yield* session.plan({
        includeConflicts,
        tasks: [entry.task],
      });
      if (!jsonMode) {
        displayDiffs(plan.entries[0]?.diffs ?? [], session.runtime.format);
      }
      const proceed = yield* prompter.confirm({
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
  });
}

function requiresTerminal(options: {
  allFlag: boolean | undefined;
  quiet: boolean;
  session: CommandSession;
}): boolean {
  const { allFlag, quiet, session } = options;
  if (quiet && !allFlag) {
    reportEmptyOutcome(
      session,
      'Interactive mode requires a terminal. Use a task ID instead.'
    );
    return true;
  }
  return false;
}

function resolveConfirmed(options: {
  allFlag: boolean | undefined;
  includeConflicts: boolean;
  jsonMode: boolean;
  selected: Array<TaskWithStatus>;
  session: CommandSession;
}): Effect.Effect<
  Array<TaskWithStatus> | null,
  AddCommandError,
  AddCommandServices
> {
  const { allFlag, includeConflicts, jsonMode, selected, session } = options;
  if (allFlag) {
    return Effect.succeed(selected);
  }
  return confirmSelected({
    includeConflicts,
    jsonMode,
    selected,
    session,
  });
}

function resolveSelection(options: {
  allFlag: boolean | undefined;
  includeConflicts: boolean;
  tasksWithStatus: Array<TaskWithStatus>;
}): Effect.Effect<
  Array<TaskWithStatus> | null,
  AddCommandError,
  AddCommandServices
> {
  const { allFlag, includeConflicts, tasksWithStatus } = options;
  if (allFlag) {
    return Effect.succeed(
      tasksWithStatus.filter((entry) =>
        isActionable(entry.status, includeConflicts)
      )
    );
  }

  return Effect.gen(function* () {
    const selectedIds = yield* selectTasksGrouped(tasksWithStatus);
    if (selectedIds === null) {
      return null;
    }
    return tasksWithStatus.filter((entry) =>
      selectedIds.includes(entry.task.id)
    );
  });
}

function reportEmptyOutcome(session: CommandSession, message: string): void {
  const checkErrors = session.checkErrorMessages;
  session.reportOutcome(
    checkErrors.length > 0
      ? session.blocked(message, { errors: checkErrors })
      : session.empty(message)
  );
}

function executeConfirmed(options: {
  confirmed: Array<TaskWithStatus>;
  includeConflicts: boolean;
  recordTiming: boolean;
  selected: Array<TaskWithStatus>;
  session: CommandSession;
}): Effect.Effect<void, AddCommandError, AddCommandServices> {
  return Effect.gen(function* () {
    const { confirmed, includeConflicts, recordTiming, selected, session } =
      options;
    // One apply for the whole confirmed selection: one backup set and one run
    // manifest, so `undo` restores the entire `add`.
    const outcome = yield* session.apply(
      confirmed.map((entry) => entry.task),
      {
        includeCheckErrors: true,
        includeConflicts,
        recordTiming,
      }
    );
    // Declined tasks count as skipped, alongside apply-time skips.
    session.reportOutcome({
      ...outcome,
      skipped: selected.length - outcome.applied,
    });
  });
}

/** The interactive `add` flow as one program: select, confirm, apply. */
export function runInteractive(
  options: RunInteractiveOptions
): Effect.Effect<void, AddCommandError, AddCommandServices> {
  return Effect.gen(function* () {
    const { all: allFlag, includeConflicts, recordTiming, session } = options;
    const { runtime, tasks } = session;
    const jsonMode = runtime.format === 'json';

    if (tasks.length === 0) {
      session.reportOutcome(
        session.empty('No tasks applicable for this project')
      );
      return;
    }

    const tasksWithStatus = buildTasksWithStatus(session);

    if (requiresTerminal({ allFlag, quiet: runtime.quiet, session })) {
      return;
    }

    const selected = yield* resolveSelection({
      allFlag,
      includeConflicts,
      tasksWithStatus,
    });
    if (selected === null) {
      session.reportOutcome(session.cancelled());
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

    const confirmed = yield* resolveConfirmed({
      allFlag,
      includeConflicts,
      jsonMode,
      selected,
      session,
    });
    if (confirmed === null) {
      session.reportOutcome(session.cancelled());
      return;
    }

    yield* executeConfirmed({
      confirmed,
      includeConflicts,
      recordTiming,
      selected,
      session,
    });
  });
}
