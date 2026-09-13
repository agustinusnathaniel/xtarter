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

/** Build task statuses, gate on a terminal, and resolve the selection. */
function selectTasksToApply(options: {
  allFlag: boolean | undefined;
  includeConflicts: boolean;
  jsonMode: boolean;
  session: CommandSession;
}): Effect.Effect<
  Array<TaskWithStatus> | null,
  AddCommandError,
  AddCommandServices
> {
  return Effect.gen(function* () {
    const { allFlag, includeConflicts, jsonMode, session } = options;
    const { runtime } = session;
    const tasksWithStatus: Array<TaskWithStatus> = session.tasks.map(
      (task) => ({
        status: session.statuses.get(task.id) ?? 'new',
        task,
      })
    );

    if (runtime.quiet && !allFlag) {
      reportEmptyOutcome(
        session,
        'Interactive mode requires a terminal. Use a task ID instead.'
      );
      return null;
    }

    let selected: Array<TaskWithStatus> | null;
    if (allFlag) {
      selected = tasksWithStatus.filter((entry) =>
        isActionable(entry.status, includeConflicts)
      );
    } else {
      const selectedIds = yield* selectTasksGrouped(tasksWithStatus);
      selected =
        selectedIds === null
          ? null
          : tasksWithStatus.filter((entry) =>
              selectedIds.includes(entry.task.id)
            );
    }
    if (selected === null) {
      session.reportOutcome(session.cancelled());
      return null;
    }
    if (selected.length === 0) {
      reportEmptyOutcome(session, 'No tasks to apply');
      return null;
    }

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

    return selected;
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

    const selected = yield* selectTasksToApply({
      allFlag,
      includeConflicts,
      jsonMode,
      session,
    });
    if (selected === null) {
      return;
    }

    let confirmed: Array<TaskWithStatus> | null = selected;
    if (!allFlag) {
      confirmed = yield* confirmSelected({
        includeConflicts,
        jsonMode,
        selected,
        session,
      });
    }
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
