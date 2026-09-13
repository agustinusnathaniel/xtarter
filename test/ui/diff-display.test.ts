import type { FileDiff } from '@xtarterize/core';
import { describe, expect } from 'vite-plus/test';

import { displayDiffs } from '../../apps/xtarterize/src/ui/diff-display.js';
import { captureConsole } from '../helpers/console.js';

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
  test('emits a machine-readable payload when there are no diffs', async () => {
    const { logs } = await captureConsole(() => {
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

  test('reports dry-run failures with ok:false in the payload', async () => {
    const { logs } = await captureConsole(() => {
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

  test('renders nothing in terminal mode when there are no diffs', async () => {
    const { logs } = await captureConsole(() => {
      displayDiffs([], 'terminal');
    });

    expect(logs).toHaveLength(0);
  });

  test('emits a payload with files when diffs exist', async () => {
    const { logs } = await captureConsole(() => {
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
