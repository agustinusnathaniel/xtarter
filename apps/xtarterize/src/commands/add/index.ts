import { logWarn } from '@xtarterize/core';
import { defineCommand } from 'citty';

import { runCliProgram } from '@/runtime.js';
import { openSession } from '@/session.js';
import { getPrompter } from '@/ui/prompter.js';
import {
  commonArgs,
  formatArgs,
  includeConflictsArg,
  timingArg,
} from '@/utils/args.js';

import { runInteractive } from './interactive.js';
import { runSingleTask } from './single-task.js';

export const addCommand = defineCommand({
  args: {
    all: {
      description:
        'Apply all applicable new and patch tasks without interaction',
      type: 'boolean',
    },
    ...commonArgs,
    ...formatArgs,
    includeConflicts: includeConflictsArg,
    taskId: {
      description: 'Task ID (e.g., lint/biome). Omit to pick interactively.',
      required: false,
      type: 'positional',
    },
    timing: timingArg,
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
  json?: boolean;
  quiet?: boolean;
  taskId?: string;
  timing?: boolean;
}

async function handleAddCommand(args: AddCommandArgs): Promise<void> {
  const session = await runCliProgram(openSession(args));
  if (!session) {
    return;
  }

  const prompter = getPrompter();
  const includeConflicts = args.includeConflicts === true;
  const recordTiming = args.timing === true;

  if (args.all && args.taskId) {
    logWarn(
      'Both --all and a task ID were specified. The task ID will be ignored.'
    );
  }

  if (args.all) {
    await runInteractive({
      all: true,
      includeConflicts,
      prompter,
      recordTiming,
      session,
    });
    return;
  }

  if (args.taskId) {
    await runSingleTask({
      includeConflicts,
      prompter,
      recordTiming,
      session,
      taskId: args.taskId,
    });
    return;
  }

  await runInteractive({
    includeConflicts,
    prompter,
    recordTiming,
    session,
  });
}
