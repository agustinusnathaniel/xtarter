import {
  ensureXtarterizeGitignore,
  logError,
  logSuccess,
} from '@xtarterize/core';
import { defineCommand } from 'citty';

import { displayDiffs } from '@/ui/diff-display.js';
import { mergeFileDiffs } from '@/ui/merge-file-diffs.js';
import { resolveCliContext, scanProject } from '@/utils/project.js';
import { collectTaskDiffs } from '@/utils/task-diffs.js';
import { printTiming } from '@/utils/timing-display.js';

export const diffCommand = defineCommand({
  args: {
    cwd: {
      description: 'Target directory (default: current working directory)',
      type: 'string',
    },
    format: {
      description: 'Output format (terminal|json)',
      type: 'string',
    },
    json: {
      description: 'Output as JSON for machine consumption',
      type: 'boolean',
    },
    quiet: {
      description: 'Suppress verbose output',
      type: 'boolean',
    },
  },
  meta: {
    description: 'Show pending changes without applying',
    name: 'diff',
  },
  async run({ args }) {
    const ctx = resolveCliContext(args);
    await ensureXtarterizeGitignore(ctx.cwd);
    const { profile, tasks, statuses, timing } = await scanProject(ctx);

    const actionableTasks = tasks.filter((task) => {
      const status = statuses.get(task.id);
      return status === 'new' || status === 'patch' || status === 'conflict';
    });
    const { diffs, failures } = await collectTaskDiffs(
      actionableTasks,
      ctx.cwd,
      profile
    );

    const mergedDiffs = mergeFileDiffs(diffs);

    if (mergedDiffs.length > 0 || failures > 0) {
      process.exitCode = 1;
    }

    if (mergedDiffs.length === 0) {
      if (ctx.format === 'json') {
        displayDiffs(mergedDiffs, ctx.format, failures);
        return;
      }
      if (failures > 0) {
        logError(`${failures} task(s) failed to dry-run`);
      } else {
        logSuccess('No pending changes');
      }
      if (!ctx.quiet) {
        printTiming(timing);
      }
      return;
    }

    displayDiffs(mergedDiffs, ctx.format, failures);
    if (!ctx.quiet) {
      printTiming(timing);
    }
  },
});
