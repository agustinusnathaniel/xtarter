import type { DiagnosticCheck, DiagnosticGroup } from '@xtarterize/core';
import { createSpinner, pc, runDiagnostics } from '@xtarterize/core';
import { defineCommand } from 'citty';

import { openSession } from '@/session.js';
import { formatDoctorResult } from '@/ui/json-formatter.js';
import { commonArgs } from '@/utils/args.js';
import { diagnosticIcon } from '@/utils/display.js';
import { printTiming } from '@/utils/timing-display.js';

export const doctorCommand = defineCommand({
  args: {
    ...commonArgs,
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
    // Doctor opts out of fail-fast: an invalid project still gets diagnosed
    // instead of exiting before the checks run.
    const session = await openSession(args, {
      allowInvalidProject: true,
      resolveTasks: false,
    });
    if (!session) {
      return;
    }
    const { cwd, json, quiet } = session.runtime;
    const verbose = args.verbose === true;
    const s = createSpinner(quiet);
    s.start('Running diagnostics...');
    const diagStart = performance.now();
    const { groups, summary } = await runDiagnostics(cwd, { verbose });
    s.stop('Diagnostics complete');
    const allDiagnostics = groups.flatMap((group) => group.checks);
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

function formatDoctorOutput(options: {
  allDiagnostics: Array<DiagnosticCheck>;
  summary: { pass: number; warn: number; fail: number; total: number };
  flags: { json: boolean; quiet: boolean; verbose: boolean };
}): boolean {
  const { allDiagnostics, summary, flags } = options;
  if (flags.json) {
    console.log(formatDoctorResult(allDiagnostics, summary));
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
  printTiming({ detectionMs: diagMs, resolutionMs: 0, resolutionSumMs: 0 });
}
