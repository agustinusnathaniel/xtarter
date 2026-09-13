import type { Effect } from 'effect';

import { cliCommand } from '@/commands/command.js';
import {
  type RunCommandArgs,
  type RunCommandError,
  type RunCommandServices,
  runCommand,
} from '@/commands/run-command.js';
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

export const syncCommand = cliCommand({
  args: sharedRunArgs,
  description: 'Update existing configurations to latest conformance',
  name: 'sync',
  program: syncProgram,
});
