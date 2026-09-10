import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  DiagnosticCheck,
  ResolveTiming,
  Task,
  TaskStatus,
} from '@xtarterize/core';
import {
  logSuccess,
  pc,
  runConflictChecks,
  runToolInstallationChecks,
  statusTag,
} from '@xtarterize/core';
import { defineCommand } from 'citty';

import { openSession } from '@/session.js';
import { formatCheckAnnotations } from '@/ui/annotations.js';
import { generateBadgeSvg } from '@/ui/badge.js';
import {
  computeCheckOk,
  countCheckSummary,
  formatCheckResult,
} from '@/ui/json-formatter.js';
import { commonArgs } from '@/utils/args.js';
import { diagnosticIcon, taskStatusIcon } from '@/utils/display.js';
import type { RuntimeContext } from '@/utils/runtime.js';
import { printTiming } from '@/utils/timing-display.js';

function emitAnnotations(options: {
  annotations: boolean;
  diagnostics: Array<DiagnosticCheck>;
  statuses: Map<string, TaskStatus>;
  tasks: Array<Task>;
}) {
  const { annotations, diagnostics, statuses, tasks } = options;
  const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
  if (!(annotations || isGitHubActions)) {
    return;
  }
  const annotationOutput = formatCheckAnnotations(tasks, statuses, diagnostics);
  if (annotationOutput) {
    process.stderr.write(`${annotationOutput}\n`);
  }
}

async function handleBadgeOutput(options: {
  badge: string | undefined;
  ctx: RuntimeContext;
  conformant: number;
  total: number;
}) {
  const { badge, ctx, conformant, total } = options;
  if (!badge) {
    return;
  }
  const svg = generateBadgeSvg({ conformant, total });
  let badgePath = badge;
  if (badgePath === '-') {
    if (ctx.json) {
      process.stderr.write(`${svg}\n`);
    } else {
      process.stdout.write(svg);
    }
    return;
  }
  const stat = await fs.stat(badgePath).catch(() => null);
  if (stat?.isDirectory()) {
    badgePath = path.join(badgePath, 'conformance.svg');
  }
  await fs.writeFile(badgePath, svg, 'utf-8');
  if (!ctx.json) {
    logSuccess(`Badge written to ${badgePath}`);
  }
}

function renderCheckSummary(options: {
  ctx: RuntimeContext;
  tasks: Array<Task>;
  statuses: Map<string, TaskStatus>;
  diagnostics: Array<DiagnosticCheck>;
  timing: ResolveTiming;
  conformant: number;
  total: number;
  badgeToStdout: boolean;
}) {
  const {
    ctx,
    tasks,
    statuses,
    diagnostics,
    timing,
    conformant,
    total,
    badgeToStdout,
  } = options;
  if (ctx.json) {
    console.log(formatCheckResult({ diagnostics, statuses, tasks, timing }));
    return;
  }
  const auditStream = badgeToStdout ? process.stderr : process.stdout;
  if (!ctx.quiet) {
    auditStream.write('\n');
    auditStream.write(`${pc.bold('Conformance audit')}\n\n`);
    for (const task of tasks) {
      const status = statuses.get(task.id) ?? 'new';
      const icon = taskStatusIcon(status, true);
      auditStream.write(
        `  ${icon} ${task.label.padEnd(40)} ${pc.dim(task.id)} ${statusTag(status)}\n`
      );
    }
    auditStream.write('\n');
    auditStream.write(`${pc.bold(`${conformant}/${total} conformant`)}\n`);
    if (diagnostics.length > 0) {
      auditStream.write(`\n${pc.bold('Diagnostics')}\n\n`);
      for (const check of diagnostics) {
        auditStream.write(
          `  ${diagnosticIcon(check.status)} ${check.message}\n`
        );
      }
    }
    auditStream.write('\n');
    printTiming(timing, undefined, {
      write: (line) => auditStream.write(`${line}\n`),
    });
    return;
  }
  auditStream.write(`${conformant}/${total} conformant\n`);
}

export const checkCommand = defineCommand({
  args: {
    annotations: {
      description:
        'Emit GitHub Actions workflow command annotations (auto-enabled in CI)',
      type: 'boolean',
    },
    badge: {
      description:
        'Generate conformance badge SVG (provide output path, or - for stdout)',
      type: 'string',
    },
    ...commonArgs,
    verbose: {
      description: 'Show tool installation and conflict checks',
      type: 'boolean',
    },
  },
  meta: {
    description: 'Audit current conformance status',
    name: 'check',
  },
  async run({ args }) {
    const session = await openSession(args);
    if (!session) {
      return;
    }
    const ctx = session.runtime;
    const { statuses, tasks, timing } = session;
    const badgeToStdout = args.badge === '-';
    const conflictChecks = await runConflictChecks(ctx.cwd);
    const installChecks = await runToolInstallationChecks(ctx.cwd);
    const diagnostics = [...installChecks, ...conflictChecks];
    const { conformant, total } = countCheckSummary(tasks, statuses);
    if (!computeCheckOk({ conformant, total }, diagnostics)) {
      process.exitCode = 1;
    }
    emitAnnotations({
      annotations: Boolean(args.annotations),
      diagnostics,
      statuses,
      tasks,
    });
    await handleBadgeOutput({
      badge: args.badge,
      conformant,
      ctx,
      total,
    });
    renderCheckSummary({
      badgeToStdout,
      conformant,
      ctx,
      diagnostics,
      statuses,
      tasks,
      timing,
      total,
    });
  },
});
