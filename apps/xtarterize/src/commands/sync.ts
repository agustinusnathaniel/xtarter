import { defineCommand } from 'citty';
import type { Effect } from 'effect';

import {
  type RunCommandArgs,
  type RunCommandError,
  type RunCommandServices,
  runCommand,
} from '@/commands/run-command.js';
import { runCliProgram } from '@/runtime.js';
import { sharedRunArgs } from '@/utils/args.js';

/** The `sync` run pipeline as one program (open, select, apply). */
export function syncProgram(
  args: RunCommandArgs
): Effect.Effect<void, RunCommandError, RunCommandServices> {
  return runCommand(args, {
    actionableStatuses: ['patch', 'conflict'],
    confirmMessage: 'How would you like to proceed?',
    emptyMessage: 'No updates available',
  });
}

export const syncCommand = defineCommand({
  args: sharedRunArgs,
  meta: {
    description: 'Update existing configurations to latest conformance',
    name: 'sync',
  },
  async run({ args }) {
    await runCliProgram(syncProgram(args));
  },
});
