import { cliCommand } from '@/commands/command.js';
import { runCliProgram } from '@/runtime.js';
import { openSession } from '@/session.js';
import { reportArgs } from '@/utils/args.js';
import { isActionableStatus } from '@/utils/display.js';

export const diffCommand = cliCommand({
  args: reportArgs,
  description: 'Show pending changes without applying',
  name: 'diff',
  program: async (args) => {
    const session = await runCliProgram(openSession(args));
    if (!session) {
      return;
    }

    const actionableTasks = session.tasks.filter((task) =>
      isActionableStatus(session.statuses.get(task.id), true)
    );
    const outcome = await runCliProgram(session.dryRun(actionableTasks));
    if (!outcome) {
      return;
    }
    session.reportOutcome(outcome);
  },
});
