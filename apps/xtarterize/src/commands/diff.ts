import { defineCommand } from 'citty';

import { runCliProgram } from '@/runtime.js';
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
    const session = await runCliProgram(openSession(args));
    if (!session) {
      return;
    }

    const actionableTasks = session.tasks.filter((task) => {
      const status = session.statuses.get(task.id);
      return status === 'new' || status === 'patch' || status === 'conflict';
    });
    const outcome = await runCliProgram(session.dryRun(actionableTasks));
    if (!outcome) {
      return;
    }
    session.reportOutcome(outcome);
  },
});
