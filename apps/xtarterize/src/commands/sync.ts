import { defineCommand } from 'citty';

import { runCommand, sharedRunArgs } from '@/commands/run-command.js';
import { resolveCwdWithPreflight } from '@/utils/preflight.js';

export const syncCommand = defineCommand({
  args: sharedRunArgs,
  meta: {
    description: 'Update existing configurations to latest conformance',
    name: 'sync',
  },
  async run({ args }) {
    const cwd = await resolveCwdWithPreflight(args);
    await runCommand(cwd, args, {
      actionableStatuses: ['patch', 'conflict'],
      confirmMessage: 'How would you like to proceed?',
      emptyMessage: 'No updates available',
    });
  },
});
