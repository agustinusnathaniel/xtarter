import type { Task, TaskStatus } from '@xtarterize/core';
import { applyTaskSelection, logInfo, logWarn } from '@xtarterize/core';

import { runCliProgram } from '@/runtime.js';
import { type CommandSession, openSession } from '@/session.js';
import { getPrompter } from '@/ui/prompter.js';
import { reportPlan } from '@/ui/reporter.js';
import { selectTasks } from '@/ui/select-menu.js';
import { printProjectProfile } from '@/utils/project.js';
import type { RuntimeContext } from '@/utils/runtime.js';

interface CommandArgs {
  dryRun?: boolean;
  format?: string;
  includeConflicts?: boolean;
  json?: boolean;
  only?: string;
  quiet?: boolean;
  skip?: string;
  timing?: boolean;
  yes?: boolean;
}

export interface RunCommandOptions {
  actionableStatuses: Array<TaskStatus>;
  confirmMessage: string;
  emptyMessage: string;
  orderTasks?: (tasks: Array<Task>, runtime: RuntimeContext) => Array<Task>;
}

interface ResolveActionableTasksOptions {
  actionableStatuses: Array<TaskStatus>;
  /** Persisted selection: when non-empty, restrict runs to these IDs */
  configOnly?: Array<string>;
  /** Persisted selection: task IDs always excluded */
  configSkip?: Array<string>;
  only?: string;
  skip?: string;
}

function resolveActionableTasks(
  tasks: Array<Task>,
  statuses: Map<string, TaskStatus>,
  options: ResolveActionableTasksOptions
): Array<Task> {
  const selected = applyTaskSelection(tasks, {
    cliOnly: options.only,
    cliSkip: options.skip,
    configOnly: options.configOnly,
    configSkip: options.configSkip,
  });

  return selected.filter((t) => {
    const status = statuses.get(t.id);
    return status !== undefined && options.actionableStatuses.includes(status);
  });
}

function warnUnknownSelection(
  selection: { skip: Array<string>; only: Array<string> },
  tasks: Array<Task>,
  quiet: boolean
): void {
  if (quiet || selection.skip.length + selection.only.length === 0) {
    return;
  }
  const unknown = [...selection.skip, ...selection.only].filter(
    (id) => !tasks.some((t) => t.id === id)
  );
  if (unknown.length > 0) {
    logWarn(
      `Selection config references unknown task IDs: ${unknown.join(', ')}`
    );
  }
}

async function applyTasks(
  session: CommandSession,
  tasks: Array<Task>,
  args: CommandArgs
): Promise<void> {
  const outcome = await runCliProgram(
    session.apply(tasks, {
      includeConflicts: args.includeConflicts,
      recordTiming: args.timing,
    })
  );
  if (outcome) {
    session.reportOutcome(outcome);
  }
}

async function promptAndApply(
  session: CommandSession,
  tasks: Array<Task>,
  { args, confirmMessage }: { args: CommandArgs; confirmMessage: string }
): Promise<void> {
  const action = await getPrompter().select({
    message: confirmMessage,
    options: [
      { label: 'Apply all', value: 'apply-all' },
      { label: 'Select tasks', value: 'select' },
      { label: 'Dry run', value: 'dry-run' },
      { label: 'Quit', value: 'quit' },
    ],
  });
  if (action === null || action === 'quit') {
    session.reportOutcome(session.cancelled());
    return;
  }
  if (action === 'dry-run') {
    const outcome = await runCliProgram(session.dryRun(tasks));
    if (outcome) {
      session.reportOutcome(outcome);
    }
    return;
  }
  if (action !== 'select') {
    await applyTasks(session, tasks, args);
    return;
  }
  const selected = await selectTasks(tasks, session.statuses, getPrompter());
  if (selected === null) {
    session.reportOutcome(session.cancelled());
    return;
  }
  if (selected.length === 0) {
    logInfo('No tasks selected');
    return;
  }
  const selectedIds = new Set(selected);
  await applyTasks(
    session,
    tasks.filter((task) => selectedIds.has(task.id)),
    args
  );
}

async function runSession(
  session: CommandSession,
  args: CommandArgs,
  options: RunCommandOptions
): Promise<void> {
  const { profile, runtime, selection, statuses, tasks } = session;
  if (!runtime.quiet) {
    printProjectProfile(profile);
  }
  warnUnknownSelection(selection, tasks, runtime.quiet);
  const actionableTasks = resolveActionableTasks(tasks, statuses, {
    actionableStatuses: options.actionableStatuses,
    configOnly: selection.only,
    configSkip: selection.skip,
    only: args.only,
    skip: args.skip,
  });
  if (actionableTasks.length === 0) {
    session.reportOutcome(session.empty(options.emptyMessage));
    return;
  }
  reportPlan(actionableTasks, statuses, runtime);
  if (args.dryRun) {
    const outcome = await runCliProgram(session.dryRun(actionableTasks));
    if (outcome) {
      session.reportOutcome(outcome);
    }
    return;
  }
  if (args.yes || runtime.quiet) {
    await applyTasks(session, actionableTasks, args);
    return;
  }
  await promptAndApply(session, actionableTasks, {
    args,
    confirmMessage: options.confirmMessage,
  });
}

export async function runCommand(
  args: CommandArgs,
  options: RunCommandOptions
): Promise<void> {
  const session = await runCliProgram(
    openSession(args, {
      orderTasks: options.orderTasks,
    })
  );
  if (!session) {
    return;
  }
  await runSession(session, args, options);
}
