import { defineCommand } from 'citty';

import { openSession } from '@/session.js';
import { commonArgs, formatArgs } from '@/utils/args.js';

export const diffCommand = defineCommand({
  args: {
    ...commonArgs,
    ...formatArgs,
  },
  meta: {
    description: 'Show pending changes without applying',
    name: 'diff',
  },
  async run({ args }) {
    const session = await openSession(args);
    if (!session) {
      return;
    }

    const actionableTasks = session.tasks.filter((task) => {
      const status = session.statuses.get(task.id);
      return status === 'new' || status === 'patch' || status === 'conflict';
    });
    const outcome = await session.dryRun(actionableTasks);
    session.reportOutcome(outcome);
  },
});
