import { defineCommand } from 'citty';

import { runCommand } from '@/commands/run-command.js';
import { sharedRunArgs } from '@/utils/args.js';

export const syncCommand = defineCommand({
  args: sharedRunArgs,
  meta: {
    description: 'Update existing configurations to latest conformance',
    name: 'sync',
  },
  async run({ args }) {
    await runCommand(args, {
      actionableStatuses: ['patch', 'conflict'],
      confirmMessage: 'How would you like to proceed?',
      emptyMessage: 'No updates available',
    });
  },
});
