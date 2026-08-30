import {
  detectPackageManager,
  detectProject,
  resolveTaskStatuses,
  runPreflight,
  scoreTasks,
  tokenize,
} from '@xtarterize/core';
import { defineCommand } from 'citty';

import { formatQueryResult } from '@/ui/json-formatter.js';
import { displayQueryResults } from '@/ui/query-display.js';
import { handlePreflightFailure } from '@/utils/preflight.js';
import { getAllTasksWithPlugins, resolveCliContext } from '@/utils/project.js';

export const queryCommand = defineCommand({
  args: {
    cwd: {
      description: 'Target directory (default: current working directory)',
      type: 'string',
    },
    json: {
      description: 'Output machine-readable JSON',
      type: 'boolean',
    },
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
    const ctx = resolveCliContext(args);
    const preflight = await runPreflight(ctx.cwd);
    handlePreflightFailure(preflight, ctx.json);
    const tasks = await getAllTasksWithPlugins(ctx.cwd);

    const queryStr = String(args.query);
    let limit = 20;
    if (args.limit !== undefined) {
      const parsed = Number.parseInt(String(args.limit), 10);
      if (Number.isNaN(parsed) || parsed < 1) {
        console.error(
          `Invalid --limit "${args.limit}": expected a positive integer`
        );
        process.exitCode = 1;
        return;
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
        process.exitCode = 1;
        return;
      }
      threshold = parsed;
    }

    const results = scoreTasks(tasks, queryStr, {
      maxResults: limit,
      minScore: threshold,
    });

    const matchedTasks = results.map((r) => r.task);
    const profile = await detectProject(ctx.cwd);
    const statuses = await resolveTaskStatuses(matchedTasks, ctx.cwd, profile);

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
