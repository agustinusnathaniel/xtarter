import type { FileDiff } from '@xtarterize/core';
import { describe, expect } from 'vite-plus/test';

import { displayDiffs } from '../../apps/xtarterize/src/ui/diff-display.js';

function captureStdout(run: () => void): Array<string> {
  const logs: Array<string> = [];
  const originalLog = console.log;
  console.log = (...args: Array<unknown>) => {
    logs.push(args.map((arg) => String(arg)).join(' '));
  };
  try {
    run();
  } finally {
    console.log = originalLog;
  }
  return logs;
}

function makeDiff(overrides: Partial<FileDiff> = {}): FileDiff {
  return {
    after: '',
    before: null,
    filepath: 'biome.json',
    stats: { added: 10, removed: 0 },
    ...overrides,
  };
}

describe('displayDiffs JSON contract', () => {
  test('emits a machine-readable payload when there are no diffs', () => {
    const logs = captureStdout(() => {
      displayDiffs([], 'json');
    });

    expect(logs).toHaveLength(1);
    const parsed = JSON.parse(logs[0]) as {
      ok: boolean;
      summary: { total: number };
      files: Array<unknown>;
    };
    expect(parsed.ok).toBe(true);
    expect(parsed.summary.total).toBe(0);
    expect(parsed.files).toEqual([]);
  });

  test('reports dry-run failures with ok:false in the payload', () => {
    const logs = captureStdout(() => {
      displayDiffs([], 'json', 2);
    });

    const parsed = JSON.parse(logs[0]) as {
      ok: boolean;
      summary: { total: number; failures?: number };
    };
    expect(parsed.ok).toBe(false);
    expect(parsed.summary.total).toBe(0);
    expect(parsed.summary.failures).toBe(2);
  });

  test('renders nothing in terminal mode when there are no diffs', () => {
    const logs = captureStdout(() => {
      displayDiffs([], 'terminal');
    });

    expect(logs).toHaveLength(0);
  });

  test('emits a payload with files when diffs exist', () => {
    const logs = captureStdout(() => {
      displayDiffs([makeDiff()], 'json');
    });

    const parsed = JSON.parse(logs[0]) as {
      ok: boolean;
      summary: { total: number };
      files: Array<{ filepath: string }>;
    };
    expect(parsed.ok).toBe(false);
    expect(parsed.summary.total).toBe(1);
    expect(parsed.files[0]?.filepath).toBe('biome.json');
  });
});
