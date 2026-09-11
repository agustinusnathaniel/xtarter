import type { Task, TaskStatus } from '@xtarterize/core';
import {
  detectPackageManager,
  resolveTaskStatuses,
  scoreTasks,
  tokenize,
} from '@xtarterize/core';
import { defineCommand } from 'citty';

import { runCliProgram } from '@/runtime.js';
import { type CommandSession, openSession } from '@/session.js';
import { formatQueryResult } from '@/ui/json-formatter.js';
import { displayQueryResults } from '@/ui/query-display.js';
import { cwdArg, jsonArg } from '@/utils/args.js';

interface QueryLimits {
  limit: number;
  threshold: number;
}

function resolveQueryLimits(args: {
  limit?: string;
  threshold?: string;
}): QueryLimits | null {
  let limit = 20;
  if (args.limit !== undefined) {
    const parsed = Number.parseInt(String(args.limit), 10);
    if (Number.isNaN(parsed) || parsed < 1) {
      console.error(
        `Invalid --limit "${args.limit}": expected a positive integer`
      );
      return null;
    }
    limit = parsed;
  }

  let threshold = 0.1;
  if (args.threshold !== undefined) {
    const parsed = Number.parseFloat(String(args.threshold));
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 1) {
      console.error(
        `Invalid --threshold "${args.threshold}": expected a number between 0 and 1`
      );
      return null;
    }
    threshold = parsed;
  }

  return { limit, threshold };
}

async function resolveMatchedStatuses(options: {
  matchedTasks: Array<Task>;
  session: CommandSession;
}): Promise<Map<string, TaskStatus>> {
  const { matchedTasks, session } = options;
  const applicableIds = new Set(session.tasks.map((task) => task.id));
  const statuses = new Map(session.statuses);
  const unresolved = matchedTasks.filter((task) => !applicableIds.has(task.id));
  if (unresolved.length === 0) {
    return statuses;
  }

  const extraStatuses = await runCliProgram(
    resolveTaskStatuses(unresolved, session.runtime.cwd, session.profile)
  );
  for (const [taskId, status] of extraStatuses) {
    statuses.set(taskId, status);
  }
  return statuses;
}

export const queryCommand = defineCommand({
  args: {
    cwd: cwdArg,
    json: jsonArg,
    limit: {
      description: 'Maximum number of results (default: 20)',
      type: 'string',
    },
    query: {
      description:
        'Natural language query (e.g. "strict typescript", "ci with linting")',
      required: true,
      type: 'positional',
    },
    threshold: {
      description: 'Minimum relevance score 0-1 (default: 0.1)',
      type: 'string',
    },
  },
  meta: {
    description: 'Search tasks by natural language query',
    name: 'query',
  },
  async run({ args }) {
    const session = await runCliProgram(openSession(args));
    if (!session) {
      return;
    }
    const ctx = session.runtime;

    const limits = resolveQueryLimits(args);
    if (!limits) {
      process.exitCode = 1;
      return;
    }

    const queryStr = String(args.query);
    const results = scoreTasks(session.allTasks, queryStr, {
      maxResults: limits.limit,
      minScore: limits.threshold,
    });
    const matchedTasks = results.map((result) => result.task);
    const statuses = await resolveMatchedStatuses({
      matchedTasks,
      session,
    });

    if (ctx.json) {
      console.log(formatQueryResult({ query: queryStr, results, statuses }));
      return;
    }

    if (results.length === 0) {
      const { tokens } = tokenize(queryStr);
      if (tokens.length === 0 && queryStr.trim().length > 0) {
        console.log(
          `Your query "${queryStr}" consists entirely of common words. Try being more specific.`
        );
      } else {
        console.log(`No tasks matched "${queryStr}"`);
      }
      return;
    }

    const pm = await detectPackageManager(ctx.cwd);
    displayQueryResults({
      packageManager: pm,
      query: queryStr,
      results,
      statuses,
    });
  },
});
