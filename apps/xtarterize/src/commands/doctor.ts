import os from 'node:os';
import type { DiagnosticCheck } from '@xtarterize/core';
import {
  createSpinner,
  pc,
  runConflictChecks,
  runEnvironmentChecks,
  runPreflight,
  runProjectHealthChecks,
  runToolInstallationChecks,
} from '@xtarterize/core';
import { defineCommand } from 'citty';

import { formatDoctorResult } from '@/ui/json-formatter.js';
import { resolveCwd } from '@/utils/cwd.js';
import { diagnosticIcon } from '@/utils/display.js';
import { handlePreflightFailure } from '@/utils/preflight.js';
import { resolveRuntimeFlags } from '@/utils/runtime-flags.js';
import { detectionOnlyTiming, printTiming } from '@/utils/timing-display.js';

interface DiagnosticGroup {
  checks: Array<DiagnosticCheck>;
  title: string;
}

export const doctorCommand = defineCommand({
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
      description: 'Suppress detailed output',
      type: 'boolean',
    },
    verbose: {
      description: 'Show additional system information',
      type: 'boolean',
    },
  },
  meta: {
    description: 'Run environment and project diagnostics',
    name: 'doctor',
  },
  async run({ args }) {
    const cwd = resolveCwd(args);
    const { json, quiet } = resolveRuntimeFlags(args);
    const verbose = args.verbose === true;
    const preflight = await runPreflight(cwd);
    handlePreflightFailure(preflight, json);
    const s = createSpinner(quiet);
    s.start('Running diagnostics...');
    const diagStart = performance.now();
    const groups = await runAllDiagnostics(cwd, verbose);
    s.stop('Diagnostics complete');
    const { allDiagnostics, summary } = summarizeDiagnostics(groups);
    if (summary.fail > 0) {
      process.exitCode = 1;
    }
    if (
      formatDoctorOutput({
        allDiagnostics,
        flags: { json, quiet, verbose },
        summary,
      })
    ) {
      return;
    }
    const diagMs = performance.now() - diagStart;
    printDoctorSummary(groups, summary, diagMs);
  },
});

function extractDiagnostics(
  results: Array<PromiseSettledResult<Array<DiagnosticCheck>>>
): [
  Array<DiagnosticCheck>,
  Array<DiagnosticCheck>,
  Array<DiagnosticCheck>,
  Array<DiagnosticCheck>,
] {
  const envChecks = extractSettledResult(results[0], [
    {
      message: 'Failed to run environment checks',
      name: 'Environment',
      status: 'fail' as const,
    },
  ]);
  const installChecks = extractSettledResult(results[1], [
    {
      message: 'Failed to run tool checks',
      name: 'Tools',
      status: 'fail' as const,
    },
  ]);
  const healthChecks = extractSettledResult(results[2], [
    {
      message: 'Failed to run project health checks',
      name: 'Project',
      status: 'fail' as const,
    },
  ]);
  const conflictChecks = extractSettledResult(results[3], [
    {
      message: 'Failed to run conflict checks',
      name: 'Configuration',
      status: 'fail' as const,
    },
  ]);
  return [envChecks, installChecks, healthChecks, conflictChecks];
}

async function runAllDiagnostics(
  cwd: string,
  verbose: boolean
): Promise<Array<DiagnosticGroup>> {
  const results = await Promise.allSettled([
    runEnvironmentChecks(cwd),
    runToolInstallationChecks(cwd),
    runProjectHealthChecks(cwd),
    runConflictChecks(cwd),
  ]);
  const [envChecks, installChecks, healthChecks, conflictChecks] =
    extractDiagnostics(results);
  const groups: Array<DiagnosticGroup> = [
    { checks: envChecks, title: 'Environment' },
    { checks: installChecks, title: 'Tools' },
    { checks: healthChecks, title: 'Project' },
    { checks: conflictChecks, title: 'Configuration' },
  ];
  if (!verbose) {
    return groups;
  }
  const mem = Math.round(os.totalmem() / 1024 ** 3);
  groups.unshift({
    checks: [
      {
        message: `${os.type()} ${os.release()} | ${os.arch()} | ${os.cpus().length} CPUs | ${mem} GB RAM`,
        name: 'Platform',
        status: 'pass',
      },
    ],
    title: 'System',
  });
  return groups;
}

function summarizeDiagnostics(groups: Array<DiagnosticGroup>) {
  const allDiagnostics = groups.flatMap((g) => g.checks);
  return {
    allDiagnostics,
    summary: {
      fail: allDiagnostics.filter((d) => d.status === 'fail').length,
      pass: allDiagnostics.filter((d) => d.status === 'pass').length,
      total: allDiagnostics.length,
      warn: allDiagnostics.filter((d) => d.status === 'warn').length,
    },
  };
}

function formatDoctorOutput(options: {
  allDiagnostics: Array<DiagnosticCheck>;
  summary: { pass: number; warn: number; fail: number; total: number };
  flags: { json: boolean; quiet: boolean; verbose: boolean };
}): boolean {
  const { allDiagnostics, summary, flags } = options;
  if (flags.json) {
    console.log(formatDoctorResult(allDiagnostics));
    return true;
  }
  if (flags.quiet && !flags.verbose) {
    console.log(
      `${summary.pass} passed, ${summary.warn} warnings, ${summary.fail} failed`
    );
    return true;
  }
  return false;
}

function printDoctorSummary(
  groups: Array<DiagnosticGroup>,
  summary: { pass: number; warn: number; fail: number; total: number },
  diagMs: number
) {
  console.log('');
  console.log(pc.bold('Project Diagnostics'));
  console.log('');
  for (const group of groups) {
    if (group.checks.length === 0) {
      continue;
    }
    console.log(`  ${pc.bold(group.title)}`);
    for (const check of group.checks) {
      console.log(`    ${diagnosticIcon(check.status)} ${check.message}`);
    }
    console.log('');
  }
  console.log(
    pc.bold(
      `${summary.pass} passed, ${summary.warn} warnings, ${summary.fail} failed (${summary.total} checks)`
    )
  );
  printTiming(detectionOnlyTiming(diagMs));
}

/**
 * Safely extract a value from a `PromiseSettledResult`, returning a fallback
 * if the promise was rejected.
 */
function extractSettledResult<T>(
  result: PromiseSettledResult<T>,
  fallback: T
): T {
  return result.status === 'fulfilled' ? result.value : fallback;
}
