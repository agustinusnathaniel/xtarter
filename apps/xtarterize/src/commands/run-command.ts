import type { Task, TaskStatus } from '@xtarterize/core';
import { applyTaskSelection, logInfo, logWarn } from '@xtarterize/core';

import {
  type CommandSession,
  openSession,
  type SessionOutcome,
} from '@/session.js';
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

interface FlowContext {
  actionableTasks: Array<Task>;
  args: CommandArgs;
  confirmMessage: string;
  session: CommandSession;
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

function reportOutcome(session: CommandSession, outcome: SessionOutcome): void {
  session.report(outcome);
  if (!outcome.ok) {
    process.exitCode = 1;
  }
}

async function dryRunFlow(
  session: CommandSession,
  tasks: Array<Task>
): Promise<void> {
  reportOutcome(session, await session.dryRun(tasks));
}

async function applyTasksFlow(
  session: CommandSession,
  tasks: Array<Task>,
  args: CommandArgs
): Promise<void> {
  const outcome = await session.apply(tasks, {
    includeConflicts: args.includeConflicts,
    recordTiming: args.timing,
  });
  reportOutcome(session, outcome);
}

async function handleSelectTasksFlow(options: FlowContext): Promise<void> {
  const { actionableTasks, args, session } = options;
  const selected = await selectTasks(
    actionableTasks,
    session.statuses,
    getPrompter()
  );
  if (selected === null) {
    reportOutcome(session, session.cancelled());
    return;
  }
  if (selected.length === 0) {
    logInfo('No tasks selected');
    return;
  }
  const selectedIds = new Set(selected);
  await applyTasksFlow(
    session,
    actionableTasks.filter((task) => selectedIds.has(task.id)),
    args
  );
}

async function handleApplyAllFlow(options: FlowContext): Promise<void> {
  await applyTasksFlow(options.session, options.actionableTasks, options.args);
}

async function promptAndApply(options: FlowContext): Promise<void> {
  const action = await getPrompter().select({
    message: options.confirmMessage,
    options: [
      { label: 'Apply all', value: 'apply-all' },
      { label: 'Select tasks', value: 'select' },
      { label: 'Dry run', value: 'dry-run' },
      { label: 'Quit', value: 'quit' },
    ],
  });
  if (action === null || action === 'quit') {
    reportOutcome(options.session, options.session.cancelled());
    return;
  }
  if (action === 'dry-run') {
    await dryRunFlow(options.session, options.actionableTasks);
    return;
  }
  if (action === 'select') {
    await handleSelectTasksFlow(options);
    return;
  }
  await handleApplyAllFlow(options);
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
    reportOutcome(session, session.empty(options.emptyMessage));
    return;
  }
  reportPlan(actionableTasks, statuses, runtime);
  if (args.dryRun) {
    await dryRunFlow(session, actionableTasks);
    return;
  }
  if (args.yes || runtime.quiet) {
    await applyTasksFlow(session, actionableTasks, args);
    return;
  }
  await promptAndApply({
    actionableTasks,
    args,
    confirmMessage: options.confirmMessage,
    session,
  });
}

export async function runCommand(
  args: CommandArgs,
  options: RunCommandOptions
): Promise<void> {
  const session = await openSession(args, {
    orderTasks: options.orderTasks,
  });
  if (!session) {
    return;
  }
  await runSession(session, args, options);
}
