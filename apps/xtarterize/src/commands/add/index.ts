import { createSpinner, detectProject, logWarn } from '@xtarterize/core';
import { defineCommand } from 'citty';

import { resolveCwdWithPreflight } from '@/utils/preflight.js';
import { getAllTasksWithPlugins } from '@/utils/project.js';
import { resolveRuntimeFlags } from '@/utils/runtime-flags.js';

import { runInteractive } from './interactive.js';
import { runSingleTask } from './single-task.js';

export const addCommand = defineCommand({
  args: {
    all: {
      description:
        'Apply all applicable new and patch tasks without interaction',
      type: 'boolean',
    },
    cwd: {
      description: 'Target directory (default: current working directory)',
      type: 'string',
    },
    format: {
      description: 'Output format (terminal|json)',
      type: 'string',
    },
    includeConflicts: {
      description: 'Include conflicting tasks when applying (default: false)',
      type: 'boolean',
    },
    quiet: {
      description: 'Suppress interactive prompts',
      type: 'boolean',
    },
    taskId: {
      description: 'Task ID (e.g., lint/biome). Omit to pick interactively.',
      required: false,
      type: 'positional',
    },
    timing: {
      description: 'Show detailed per-task timing breakdown',
      type: 'boolean',
    },
  },
  meta: {
    description: 'Add a specific task (or pick interactively)',
    name: 'add',
  },
  async run({ args }) {
    await handleAddCommand(args);
  },
});

interface AddCommandArgs {
  all?: boolean;
  cwd?: string;
  format?: string;
  includeConflicts?: boolean;
  quiet?: boolean;
  taskId?: string;
  timing?: boolean;
}

async function handleAddCommand(args: AddCommandArgs): Promise<void> {
  const cwd = await resolveCwdWithPreflight(args as { cwd?: string });
  const { format, quiet: runtimeQuiet } = resolveRuntimeFlags(args);
  const jsonMode = format === 'json';
  const quiet = jsonMode || Boolean(runtimeQuiet);
  const recordTiming = args.timing === true;

  const spinner = createSpinner(quiet);
  spinner.start('Scanning project...');
  const detectionStart = performance.now();
  const profile = await detectProject(cwd);
  const detectionMs = performance.now() - detectionStart;
  spinner.stop('Project scanned');

  const allTasks = await getAllTasksWithPlugins(cwd);

  if (args.all && args.taskId) {
    logWarn(
      'Both --all and a task ID were specified. The task ID will be ignored.'
    );
  }

  if (args.all) {
    await runInteractive({
      all: true,
      allTasks,
      cwd,
      detectionMs,
      format,
      includeConflicts: args.includeConflicts === true,
      profile,
      quiet,
      recordTiming,
    });
    return;
  }

  if (args.taskId) {
    await runSingleTask({
      allTasks,
      cwd,
      detectionMs,
      format,
      includeConflicts: args.includeConflicts === true,
      profile,
      quiet,
      recordTiming,
      taskId: args.taskId,
    });
    return;
  }

  await runInteractive({
    allTasks,
    cwd,
    detectionMs,
    format,
    includeConflicts: args.includeConflicts === true,
    profile,
    quiet,
    recordTiming,
  });
}
