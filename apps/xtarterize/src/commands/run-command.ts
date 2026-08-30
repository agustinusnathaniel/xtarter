import { select } from '@clack/prompts';
import type { ResolveTiming, Task, TaskStatus } from '@xtarterize/core';
import {
  abortIfCancelled,
  applyTaskSelection,
  applyTasks,
  isCI,
  loadSelectionConfig,
  logError,
  logInfo,
  logSuccess,
  logWarn,
  resolveProjectTasks,
} from '@xtarterize/core';

import { type DisplayFormat, displayDiffs } from '@/ui/diff-display.js';
import { formatRunResult } from '@/ui/json-formatter.js';
import { mergeFileDiffs } from '@/ui/merge-file-diffs.js';
import { displayPlan } from '@/ui/plan-display.js';
import { selectTasks } from '@/ui/select-menu.js';
import {
  detectProjectWithAmbiguity,
  getAllTasksWithPlugins,
  printProjectProfile,
} from '@/utils/project.js';
import { resolveRuntimeFlags } from '@/utils/runtime-flags.js';
import { collectTaskDiffs } from '@/utils/task-diffs.js';
import { formatTimingJson, printTiming } from '@/utils/timing-display.js';

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

interface RunCommandOptions {
  actionableStatuses: Array<TaskStatus>;
  confirmMessage: string;
  emptyMessage: string;
  orderedTasks?: Array<Task>;
}

interface ApplyAndReportOptions {
  includeConflicts?: boolean;
  quiet?: boolean;
  recordTiming?: boolean;
  selectedIds?: Array<string>;
}

interface ApplyAndReportInput {
  cwd: string;
  format?: string;
  options: ApplyAndReportOptions;
  profile: Awaited<ReturnType<typeof detectProjectWithAmbiguity>>;
  statuses?: ReadonlyMap<string, TaskStatus>;
  tasks: Array<Task>;
  timing: ResolveTiming;
}

async function applyAndReport({
  tasks,
  cwd,
  profile,
  timing,
  format,
  options,
  statuses,
}: ApplyAndReportInput): Promise<void> {
  const { selectedIds, includeConflicts, quiet, recordTiming } = options;
  const result = await applyTasks({
    cwd,
    includeConflicts,
    profile,
    quiet: quiet ?? isCI(),
    selectedIds,
    statuses,
    tasks,
  });

  if (format === 'json') {
    console.log(
      formatRunResult({
        applied: result.applied,
        errors: result.errors,
        ok: result.errors.length === 0,
        skipped: result.skipped,
        timing: recordTiming
          ? formatTimingJson(timing, result.timing)
          : undefined,
      })
    );
    if (result.errors.length > 0) {
      process.exitCode = 1;
    }
    return;
  }

  console.log('');
  logSuccess(`Applied ${result.applied} tasks`);
  if (result.errors.length > 0) {
    logError(`${result.errors.length} errors`);
    for (const error of result.errors) {
      logError(`  - ${error}`);
    }
    process.exitCode = 1;
  }
  const quietFlag = quiet ?? isCI();
  if (!quietFlag) {
    printTiming(timing, result.timing, { recordTiming });
  }
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

interface DryRunOptions {
  cwd: string;
  format?: string;
  profile: Awaited<ReturnType<typeof detectProjectWithAmbiguity>>;
  tasks: Array<Task>;
  timing: ResolveTiming;
}

async function handleDryRun(options: DryRunOptions): Promise<void> {
  const { tasks, cwd, profile, timing, format } = options;
  const { diffs, failures } = await collectTaskDiffs(tasks, cwd, profile);
  const mergedDiffs = mergeFileDiffs(diffs);
  if (mergedDiffs.length > 0 || failures > 0) {
    process.exitCode = 1;
  }
  const resolvedFormat: DisplayFormat = format === 'json' ? 'json' : 'terminal';
  displayDiffs(mergedDiffs, resolvedFormat, failures);
  if (format !== 'json') {
    printTiming(timing);
  }
}

interface PromptAndApplyOptions {
  actionableTasks: Array<Task>;
  args: CommandArgs;
  cwd: string;
  format?: string;
  profile: Awaited<ReturnType<typeof detectProjectWithAmbiguity>>;
  runOptions: RunCommandOptions;
  statuses: Map<string, TaskStatus>;
  timing: ResolveTiming;
}

async function handleSelectTasksFlow(
  options: PromptAndApplyOptions
): Promise<boolean> {
  const { actionableTasks, cwd, profile, statuses, timing, args, format } =
    options;
  const selected = await selectTasks(actionableTasks, statuses);
  if (selected.length === 0) {
    logInfo('No tasks selected');
    return true;
  }
  await applyAndReport({
    cwd,
    format,
    options: {
      includeConflicts: args.includeConflicts,
      quiet: args.quiet,
      recordTiming: args.timing,
      selectedIds: selected,
    },
    profile,
    statuses,
    tasks: actionableTasks,
    timing,
  });
  return true;
}

async function handleApplyAllFlow(
  options: PromptAndApplyOptions
): Promise<void> {
  const { actionableTasks, cwd, profile, statuses, timing, args, format } =
    options;
  const selectedIds = actionableTasks.map((task) => task.id);
  await applyAndReport({
    cwd,
    format,
    options: {
      includeConflicts: args.includeConflicts,
      quiet: args.quiet,
      recordTiming: args.timing,
      selectedIds,
    },
    profile,
    statuses,
    tasks: actionableTasks,
    timing,
  });
}

async function promptAndApply(options: PromptAndApplyOptions): Promise<void> {
  const { actionableTasks, cwd, profile, timing, runOptions, format } = options;
  const action = await select({
    message: runOptions.confirmMessage,
    options: [
      { label: 'Apply all', value: 'apply-all' },
      { label: 'Select tasks', value: 'select' },
      { label: 'Dry run', value: 'dry-run' },
      { label: 'Quit', value: 'quit' },
    ],
  });
  abortIfCancelled(action);
  if (action === 'quit') {
    logInfo('Cancelled');
    return;
  }
  if (action === 'dry-run') {
    await handleDryRun({
      cwd,
      format,
      profile,
      tasks: actionableTasks,
      timing,
    });
    return;
  }
  if (action === 'select') {
    await handleSelectTasksFlow(options);
    return;
  }
  await handleApplyAllFlow(options);
}

async function loadProjectContext(
  cwd: string,
  quiet: boolean,
  orderedTasks: Array<Task> | undefined
) {
  const allTasks = orderedTasks ?? (await getAllTasksWithPlugins(cwd));
  const {
    profile: baseProfile,
    tasks,
    statuses,
    timing,
  } = await resolveProjectTasks(cwd, allTasks);
  const profile = await detectProjectWithAmbiguity(cwd, quiet, baseProfile);
  if (!quiet) {
    printProjectProfile(profile);
  }
  const selection = await loadSelectionConfig(cwd);
  return { profile, selection, statuses, tasks, timing };
}

function warnUnknownSelection(
  selection: { skip: Array<string>; only: Array<string> },
  tasks: Array<Task>,
  quiet: boolean
) {
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

function handleEmptyActionable(options: {
  actionableTasks: Array<Task>;
  jsonMode: boolean;
  quiet: boolean;
  timing: ResolveTiming;
  emptyMessage: string;
}): boolean {
  const { actionableTasks, jsonMode, quiet, timing, emptyMessage } = options;
  if (actionableTasks.length > 0) {
    return false;
  }
  if (jsonMode) {
    console.log(
      formatRunResult({ applied: 0, errors: [], ok: true, skipped: 0 })
    );
  } else {
    logSuccess(emptyMessage);
    if (!quiet) {
      printTiming(timing);
    }
  }
  return true;
}

export async function runCommand(
  cwd: string,
  args: CommandArgs,
  options: RunCommandOptions
): Promise<void> {
  const { format, quiet: runtimeQuiet } = resolveRuntimeFlags(args);
  const jsonMode = format === 'json';
  const quiet = jsonMode || runtimeQuiet;
  const { profile, tasks, statuses, timing, selection } =
    await loadProjectContext(cwd, quiet, options.orderedTasks);
  warnUnknownSelection(selection, tasks, quiet);
  const actionableTasks = resolveActionableTasks(tasks, statuses, {
    actionableStatuses: options.actionableStatuses,
    configOnly: selection.only,
    configSkip: selection.skip,
    only: args.only,
    skip: args.skip,
  });
  if (
    handleEmptyActionable({
      actionableTasks,
      emptyMessage: options.emptyMessage,
      jsonMode,
      quiet,
      timing,
    })
  ) {
    return;
  }
  if (!quiet) {
    displayPlan(actionableTasks, statuses);
  }
  if (args.dryRun) {
    await handleDryRun({
      cwd,
      format,
      profile,
      tasks: actionableTasks,
      timing,
    });
    return;
  }
  if (args.yes || quiet) {
    await applyAndReport({
      cwd,
      format,
      options: {
        includeConflicts: args.includeConflicts,
        quiet,
        recordTiming: args.timing,
      },
      profile,
      statuses,
      tasks: actionableTasks,
      timing,
    });
    return;
  }
  await promptAndApply({
    actionableTasks,
    args,
    cwd,
    format,
    profile,
    runOptions: options,
    statuses,
    timing,
  });
}

export const sharedRunArgs = {
  cwd: {
    description: 'Target directory (default: current working directory)',
    type: 'string',
  },
  dryRun: {
    description: 'Preview changes without applying',
    type: 'boolean',
  },
  format: {
    description: 'Output format (terminal|json)',
    type: 'string',
  },
  includeConflicts: {
    description: 'Include conflicting tasks when applying (default: false)',
    type: 'boolean',
  },
  only: {
    description: 'Apply only a specific task',
    type: 'string',
  },
  quiet: {
    description: 'Suppress interactive prompts and verbose output',
    type: 'boolean',
  },
  skip: {
    description: 'Exclude a specific task (comma-separated)',
    type: 'string',
  },
  timing: {
    description: 'Show detailed per-task timing breakdown',
    type: 'boolean',
  },
  yes: {
    description: 'Skip all confirmations, apply all',
    type: 'boolean',
  },
} as const;
