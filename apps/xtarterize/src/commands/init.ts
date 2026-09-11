import type { Task } from '@xtarterize/core';
import { scoreTasks } from '@xtarterize/core';
import { defineCommand } from 'citty';
import type { Effect } from 'effect';

import {
  type RunCommandError,
  type RunCommandServices,
  runCommand,
} from '@/commands/run-command.js';
import { runCliProgram } from '@/runtime.js';
import { sharedRunArgs } from '@/utils/args.js';
import type { RuntimeContext } from '@/utils/runtime.js';

interface ComposeArgs {
  compose?: string;
  threshold?: string;
}

export interface InitCommandArgs extends ComposeArgs {
  cwd?: string;
  dryRun?: boolean;
  format?: string;
  includeConflicts?: boolean;
  json?: boolean;
  only?: string;
  quiet?: boolean;
  skip?: string;
  timing?: boolean;
  yes?: boolean;
}

function composeThreshold(args: ComposeArgs): number {
  if (!args.threshold) {
    return 0.1;
  }
  return Math.min(
    1,
    Math.max(0, Number.parseFloat(String(args.threshold)) || 0.1)
  );
}

function orderTasksByCompose(
  tasks: Array<Task>,
  args: ComposeArgs,
  runtime: RuntimeContext
): Array<Task> {
  if (!args.compose) {
    return tasks;
  }

  const composeQuery = String(args.compose);
  const scored = scoreTasks(tasks, composeQuery, {
    minScore: composeThreshold(args),
  });
  const rankedIds = new Map(
    scored.map((result, index) => [result.taskId, index])
  );
  const ordered = [...tasks].sort((a, b) => {
    const aScore = rankedIds.get(a.id) ?? Number.POSITIVE_INFINITY;
    const bScore = rankedIds.get(b.id) ?? Number.POSITIVE_INFINITY;
    return aScore - bScore;
  });

  if (!runtime.quiet) {
    console.log('');
    console.log(`Composing plan for: "${composeQuery}"`);
    if (scored.length > 0) {
      const topTask = scored[0].task;
      console.log(
        `Best match: ${topTask.label} (${(scored[0].relevance * 100).toFixed(0)}% relevance)`
      );
    }
    console.log(`Tasks ranked by relevance across ${scored.length} matches`);
  }

  return ordered;
}

/** The `init` run pipeline as one program (open, compose, select, apply). */
export function initProgram(
  args: InitCommandArgs
): Effect.Effect<void, RunCommandError, RunCommandServices> {
  return runCommand(args, {
    actionableStatuses: ['new', 'patch', 'conflict'],
    confirmMessage: 'How would you like to proceed?',
    emptyMessage: 'Project is already fully conformant!',
    orderTasks: (tasks, runtime) => orderTasksByCompose(tasks, args, runtime),
  });
}

export const initCommand = defineCommand({
  args: {
    ...sharedRunArgs,
    compose: {
      description:
        'Natural language query to compose a targeted task plan (e.g. "strict TypeScript with CI")',
      type: 'string',
    },
    threshold: {
      description: 'Minimum relevance score 0-1 for compose (default: 0.1)',
      type: 'string',
    },
  },
  meta: {
    description: 'Initialize xtarterize conformance for a project',
    name: 'init',
  },
  async run({ args }) {
    await runCliProgram(initProgram(args));
  },
});
