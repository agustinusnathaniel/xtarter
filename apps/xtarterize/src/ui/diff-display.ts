import type { DiffHunk, FileDiff } from '@xtarterize/core';
import { actionTag, formatDiffHeader, pc } from '@xtarterize/core';
import Table from 'cli-table3';

export type DisplayFormat = 'terminal' | 'json';

export function displayDiffs(
  diffs: Array<FileDiff>,
  format: DisplayFormat = 'terminal',
  failures = 0
): void {
  // JSON mode always emits a machine-readable payload - including the
  // empty-diffs case - so consumers can always parse stdout. Terminal
  // mode has nothing to render when diffs are empty.
  if (format === 'json') {
    displayJsonDiffs(diffs, failures);
    return;
  }

  if (diffs.length === 0) {
    return;
  }

  displayTerminalDiffs(diffs);
}

function displayTerminalDiffs(diffs: Array<FileDiff>): void {
  const totalStats = computeTotalStats(diffs);

  const table = new Table({
    chars: {
      bottom: '─',
      'bottom-left': '└',
      'bottom-mid': '┴',
      'bottom-right': '┘',
      left: '│',
      'left-mid': '├',
      mid: '─',
      'mid-mid': '┼',
      middle: '│',
      right: '│',
      'right-mid': '┤',
      top: '─',
      'top-left': '┌',
      'top-mid': '┬',
      'top-right': '┐',
    },
    head: [pc.bold('Action'), pc.bold('File'), pc.bold('Changes')],
    style: { border: [], head: [] },
  });

  for (const diff of diffs) {
    const isNew = diff.before === null;
    const action = actionTag(isNew ? 'create' : 'modify');
    const stats = diff.stats
      ? `${pc.green(`+${diff.stats.added}`)} ${pc.red(`-${diff.stats.removed}`)}`
      : '';
    table.push([action, diff.filepath, stats]);
  }

  console.log('');
  console.log(pc.bold('Files to change'));
  console.log('');
  console.log(table.toString());

  if (totalStats) {
    console.log(
      `  ${pc.dim('Total:')} ${pc.green(`+${totalStats.added}`)} ${pc.red(`-${totalStats.removed}`)} ${pc.dim('across')} ${pc.bold(String(diffs.length))} ${pc.dim('files')}`
    );
  }

  console.log('');

  for (const diff of diffs) {
    renderFileDiff(diff);
  }
}

function renderFileDiff(diff: FileDiff): void {
  const isNew = diff.before === null;
  const stats = diff.stats
    ? `  ${pc.green(`+${diff.stats.added}`)} ${pc.red(`-${diff.stats.removed}`)}`
    : '';

  console.log(pc.bold(formatDiffHeader(diff.filepath, isNew)) + stats);
  console.log('');

  if (diff.hunks) {
    renderHunkDiff(diff.hunks);
  }

  console.log('');
}

function renderHunkDiff(hunks: Array<DiffHunk>): void {
  for (const hunk of hunks) {
    console.log(pc.cyan(hunk.header));
    for (const line of hunk.lines) {
      if (line.startsWith('+ ')) {
        console.log(pc.green(line));
      } else if (line.startsWith('- ')) {
        console.log(pc.red(line));
      } else {
        console.log(line);
      }
    }
  }
}

function displayJsonDiffs(diffs: Array<FileDiff>, failures = 0): void {
  const output = buildJsonOutput(diffs, failures);
  console.log(JSON.stringify(output));
}

function buildJsonOutput(diffs: Array<FileDiff>, failures = 0): JsonOutput {
  const totalStats = computeTotalStats(diffs);

  return {
    files: diffs.map((diff) => ({
      action: diff.before === null ? 'create' : 'modify',
      after: diff.after,
      before: diff.before ?? undefined,
      filepath: diff.filepath,
      hunks: diff.hunks,
      semantic: diff.semantic,
      stats: diff.stats,
    })),
    ok: diffs.length === 0 && failures === 0,
    summary: {
      total: diffs.length,
      ...(failures > 0 ? { failures } : {}),
      stats: totalStats ?? undefined,
    },
  };
}

interface JsonOutput {
  files: Array<{
    filepath: string;
    action: 'create' | 'modify';
    stats?: { added: number; removed: number };
    semantic?: {
      added?: Record<string, string>;
      removed?: Record<string, string>;
      modified?: Record<string, { before: string; after: string }>;
    };
    hunks?: Array<{
      header: string;
      lines: Array<string>;
      added: number;
      removed: number;
    }>;
    before?: string;
    after: string;
  }>;
  ok: boolean;
  summary: {
    total: number;
    failures?: number;
    stats?: { added: number; removed: number };
  };
}

function computeTotalStats(
  diffs: Array<FileDiff>
): { added: number; removed: number } | undefined {
  let totalAdded = 0;
  let totalRemoved = 0;
  let hasStats = false;
  for (const diff of diffs) {
    if (diff.stats) {
      totalAdded += diff.stats.added;
      totalRemoved += diff.stats.removed;
      hasStats = true;
    }
  }
  return hasStats ? { added: totalAdded, removed: totalRemoved } : undefined;
}
