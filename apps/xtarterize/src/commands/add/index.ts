import { logWarn } from '@xtarterize/core';
import { defineCommand } from 'citty';
import { Effect } from 'effect';

import { runCliProgram } from '@/runtime.js';
import { openSession } from '@/session.js';
import {
  commonArgs,
  formatArgs,
  includeConflictsArg,
  timingArg,
} from '@/utils/args.js';

import { runInteractive } from './interactive.js';
import { runSingleTask } from './single-task.js';
import type { AddCommandError, AddCommandServices } from './types.js';

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
    await runCliProgram(addProgram(args));
  },
});

export interface AddCommandArgs {
  all?: boolean;
  cwd?: string;
  format?: string;
  includeConflicts?: boolean;
  json?: boolean;
  quiet?: boolean;
  taskId?: string;
  timing?: boolean;
}

/** The `add` command as one program: open once, then pick or apply tasks. */
export function addProgram(
  args: AddCommandArgs
): Effect.Effect<void, AddCommandError, AddCommandServices> {
  return Effect.gen(function* () {
    const session = yield* openSession(args);
    if (!session) {
      return;
    }

    const includeConflicts = args.includeConflicts === true;
    const recordTiming = args.timing === true;

    if (args.all && args.taskId) {
      logWarn(
        'Both --all and a task ID were specified. The task ID will be ignored.'
      );
    }

    if (args.all) {
      yield* runInteractive({
        all: true,
        includeConflicts,
        recordTiming,
        session,
      });
      return;
    }

    if (args.taskId) {
      yield* runSingleTask({
        includeConflicts,
        recordTiming,
        session,
        taskId: args.taskId,
      });
      return;
    }

    yield* runInteractive({
      includeConflicts,
      recordTiming,
      session,
    });
  });
}
