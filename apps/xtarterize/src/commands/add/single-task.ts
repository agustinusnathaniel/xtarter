import type { Task, TaskStatus } from '@xtarterize/core';
import { logInfo, statusTag } from '@xtarterize/core';
import { Effect } from 'effect';

import type { CommandSession, SessionTaskOutcome } from '@/session.js';
import { displayDiffs } from '@/ui/diff-display.js';
import { type PromptError, Prompter } from '@/ui/prompter.js';

import type {
  AddCommandError,
  AddCommandServices,
  RunSingleTaskOptions,
} from './types.js';

function reportMissingTask(options: {
  allTasks: Array<Task>;
  jsonMode: boolean;
  session: CommandSession;
  taskId: string;
}): void {
  const { allTasks, jsonMode, session, taskId } = options;
  const message = `Task "${taskId}" not found`;
  session.reportOutcome(
    session.blocked(message, { errors: [message], taskId })
  );
  if (!jsonMode) {
    logInfo('Available tasks:');
    for (const task of allTasks) {
      console.log(`  ${task.id}`);
    }
  }
}

function reportNotApplicable(session: CommandSession, taskId: string): void {
  session.reportOutcome(
    session.empty(`Task "${taskId}" is not applicable for this project`, {
      taskId,
      taskStatus: 'not-applicable',
    })
  );
}

function reportCheckError(
  session: CommandSession,
  taskId: string,
  detail: string
): void {
  const message = `Failed to check ${taskId}: ${detail}`;
  session.reportOutcome(
    session.blocked(message, { errors: [message], taskId })
  );
}

function reportSkip(
  session: CommandSession,
  taskId: string,
  status: SessionTaskOutcome
): void {
  session.reportOutcome(
    session.empty('Already conformant', { taskId, taskStatus: status })
  );
}

function reportConflict(session: CommandSession, taskId: string): void {
  session.reportOutcome(
    session.blocked(
      `Task "${taskId}" conflicts with existing configuration and was not applied`,
      {
        hint: 'Resolve the conflict manually, then re-run to apply.',
        taskId,
        taskStatus: 'conflict',
      }
    )
  );
}

function confirmApply(): Effect.Effect<boolean | null, PromptError, Prompter> {
  return Effect.flatMap(Prompter, (prompter) =>
    prompter.confirm({ message: 'Apply this change?' })
  );
}

function executeTask(options: {
  includeConflicts: boolean;
  recordTiming: boolean;
  session: CommandSession;
  status: TaskStatus;
  task: Task;
}): Effect.Effect<void, AddCommandError, AddCommandServices> {
  return Effect.gen(function* () {
    const { includeConflicts, recordTiming, session, status, task } = options;
    const { runtime } = session;
    const jsonMode = runtime.format === 'json';

    const plan = yield* session.plan({ includeConflicts, tasks: [task] });
    if (!(runtime.quiet || jsonMode)) {
      displayDiffs(plan.entries[0]?.diffs ?? [], runtime.format);
      const proceed = yield* confirmApply();
      if (proceed === null) {
        session.reportOutcome(session.cancelled());
        return;
      }
      if (!proceed) {
        return;
      }
    }

    const result = yield* session.execute(plan);
    // Only this task's own failure may fail the run. Session-wide check errors
    // belong to unrelated tasks; the requested task's own check error is already
    // reported before execution by `runSingleTask`.
    session.reportOutcome(
      session.outcomeFor(result, {
        includeCheckErrors: false,
        recordTiming,
        taskId: task.id,
        taskStatus: status,
      })
    );
  });
}

/** Add one named task as one program: plan, confirm, execute. */
export function runSingleTask(
  options: RunSingleTaskOptions
): Effect.Effect<void, AddCommandError, AddCommandServices> {
  return Effect.gen(function* () {
    const { includeConflicts, recordTiming, session, taskId } = options;
    const { allTasks, runtime, statuses } = session;
    const jsonMode = runtime.format === 'json';

    const task = allTasks.find((entry) => entry.id === taskId);
    if (!task) {
      reportMissingTask({ allTasks, jsonMode, session, taskId });
      return;
    }

    if (!task.applicable(session.profile)) {
      reportNotApplicable(session, taskId);
      return;
    }

    const checkError = session.checkErrors.get(task.id);
    if (checkError) {
      reportCheckError(session, task.id, checkError);
      return;
    }

    const status = statuses.get(task.id) ?? 'new';
    if (!runtime.quiet) {
      console.log(`${statusTag(status)} ${task.id}`);
    }

    if (status === 'skip') {
      reportSkip(session, taskId, status);
      return;
    }
    if (status === 'conflict' && !includeConflicts) {
      reportConflict(session, taskId);
      return;
    }

    yield* executeTask({
      includeConflicts,
      recordTiming,
      session,
      status,
      task,
    });
  });
}
