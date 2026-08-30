import type { ApplyTiming, ResolveTiming } from '@xtarterize/core';
import { pc } from '@xtarterize/core';

function formatMs(ms: number, precision = 1): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  return `${(ms / 1000).toFixed(precision)}s`;
}

export function formatTimingJson(
  resolve: ResolveTiming,
  apply?: ApplyTiming
): Record<string, unknown> {
  const obj: Record<string, unknown> = {
    detectionMs: resolve.detectionMs,
    resolutionMs: resolve.resolutionMs,
    resolutionSumMs: resolve.resolutionSumMs,
  };
  if (apply) {
    obj.applyMs = apply.applyMs;
    if (apply.tasks.length > 0) {
      obj.tasks = apply.tasks;
    }
  }
  return obj;
}

export function detectionOnlyTiming(detectionMs: number): ResolveTiming {
  return { detectionMs, resolutionMs: 0, resolutionSumMs: 0 };
}

export function printTiming(
  resolve: ResolveTiming,
  apply?: ApplyTiming,
  options?: {
    recordTiming?: boolean;
    write?: (line: string) => void;
  }
): void {
  const { recordTiming, write = console.log } = options ?? {};
  const lines: Array<string> = [];
  lines.push('');
  lines.push(pc.bold('Timing'));

  lines.push(`  Detection    ${pc.dim(formatMs(resolve.detectionMs))}`);

  const sumLabel = `∑ ${formatMs(resolve.resolutionSumMs, 2)}`;
  lines.push(
    `  Resolution   ${pc.dim(formatMs(resolve.resolutionMs))} ${pc.dim(`(${sumLabel} across checks)`)}`
  );

  if (apply) {
    lines.push(`  Apply        ${pc.dim(formatMs(apply.applyMs))}`);
  }

  if (recordTiming && apply && apply.tasks.length > 0) {
    const headerLabel = `${'Task'.padEnd(42)} ${'Check'.padEnd(10)} ${'Dry-run'.padEnd(10)} ${'Apply'.padEnd(10)}`;
    lines.push(`  ${pc.dim(headerLabel)}`);
    for (const t of apply.tasks) {
      const check =
        t.checkMs === undefined || t.checkMs === null
          ? '-'
          : formatMs(t.checkMs);
      const dry =
        t.dryRunMs === undefined || t.dryRunMs === null
          ? '-'
          : formatMs(t.dryRunMs);
      const app =
        t.applyMs === undefined || t.applyMs === null
          ? '-'
          : formatMs(t.applyMs);
      lines.push(
        `  ${t.label.padEnd(42)} ${check.padEnd(10)} ${dry.padEnd(10)} ${app.padEnd(10)}`
      );
    }
  }

  write(lines.join('\n'));
  write('');
}
