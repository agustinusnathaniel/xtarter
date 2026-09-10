import { pc, statusTag } from '@xtarterize/core';
import { defineCommand } from 'citty';

import { openSession } from '@/session.js';
import { formatListResult } from '@/ui/json-formatter.js';
import { commonArgs } from '@/utils/args.js';
import { taskStatusIcon } from '@/utils/display.js';
import { printTiming } from '@/utils/timing-display.js';

export const listCommand = defineCommand({
  args: {
    ...commonArgs,
  },
  meta: {
    description: 'List all available tasks',
    name: 'list',
  },
  async run({ args }) {
    const session = await openSession(args);
    if (!session) {
      return;
    }
    const { profile, runtime, statuses, tasks, timing } = session;

    if (runtime.json) {
      console.log(formatListResult({ profile, statuses, tasks, timing }));
      return;
    }

    let currentGroup = '';

    for (const task of tasks) {
      if (task.group !== currentGroup) {
        currentGroup = task.group;
        console.log('');
        console.log(pc.bold(currentGroup));
      }

      const status = statuses.get(task.id) ?? 'new';
      const icon = taskStatusIcon(status);

      console.log(
        `  ${icon} ${task.label.padEnd(40)} ${pc.dim(task.id)} ${statusTag(status)}`
      );
    }

    console.log('');
    printTiming(timing);
  },
});
