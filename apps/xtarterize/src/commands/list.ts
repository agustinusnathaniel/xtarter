import { ensureXtarterizeGitignore, pc, statusTag } from '@xtarterize/core';
import { defineCommand } from 'citty';

import { formatListResult } from '@/ui/json-formatter.js';
import { taskStatusIcon } from '@/utils/display.js';
import { resolveCliContext, scanProject } from '@/utils/project.js';
import { printTiming } from '@/utils/timing-display.js';

export const listCommand = defineCommand({
  args: {
    cwd: {
      description: 'Target directory (default: current working directory)',
      type: 'string',
    },
    json: {
      description: 'Output machine-readable JSON',
      type: 'boolean',
    },
    quiet: {
      description: 'Suppress verbose output',
      type: 'boolean',
    },
  },
  meta: {
    description: 'List all available tasks',
    name: 'list',
  },
  async run({ args }) {
    const ctx = resolveCliContext(args);
    await ensureXtarterizeGitignore(ctx.cwd);
    const { profile, tasks, statuses, timing } = await scanProject(ctx);

    if (ctx.json) {
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
