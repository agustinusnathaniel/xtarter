import {
  computeChangeStats,
  computeSemanticJsonDiff,
  computeUnifiedHunks,
  enhanceDiff,
  formatDiffHeader,
  generateDiff,
} from '@xtarterize/core';
import { describe, expect } from 'vite-plus/test';

describe('generateDiff', () => {
  test('shows added lines', () => {
    const result = generateDiff(null, 'line1\nline2\n');
    expect(result).toContain('+ line1');
    expect(result).toContain('+ line2');
  });

  test('shows removed lines', () => {
    const result = generateDiff('old\n', 'new\n');
    const lines = result.split('\n');
    expect(lines.some((l) => l.includes('- old'))).toBe(true);
    expect(lines.some((l) => l.includes('+ new'))).toBe(true);
  });

  test('shows unchanged lines without prefix', () => {
    const result = generateDiff('keep\n', 'keep\n');
    expect(result).not.toContain('+');
    expect(result).not.toContain('-');
  });
});

describe('computeChangeStats', () => {
  test('counts added and removed lines', () => {
    const stats = computeChangeStats('a\nb\n', 'a\nc\nd\n');
    expect(stats.added).toBe(2);
    expect(stats.removed).toBe(1);
  });

  test('returns zeros for identical content', () => {
    const stats = computeChangeStats('same\n', 'same\n');
    expect(stats.added).toBe(0);
    expect(stats.removed).toBe(0);
  });
});

describe('computeUnifiedHunks', () => {
  test('returns a single hunk with header', () => {
    const hunks = computeUnifiedHunks('a\nb\n', 'a\nc\n');
    expect(hunks.length).toBe(1);
    expect(hunks[0].header).toMatch(/^@@/);
  });

  test('tracks added and removed counts', () => {
    const hunks = computeUnifiedHunks('a\nb\n', 'a\nc\nd\n');
    expect(hunks[0].added).toBe(2);
    expect(hunks[0].removed).toBe(1);
  });
});

describe('computeSemanticJsonDiff', () => {
  test('detects added keys', () => {
    const result = computeSemanticJsonDiff('{"a": 1}', '{"a": 1, "b": 2}');
    expect(result?.added).toBeDefined();
    expect(result?.added?.b).toBe('2');
  });

  test('detects removed keys', () => {
    const result = computeSemanticJsonDiff('{"a": 1, "b": 2}', '{"a": 1}');
    expect(result?.removed).toBeDefined();
    expect(result?.removed?.b).toBe('2');
  });

  test('detects modified keys', () => {
    const result = computeSemanticJsonDiff('{"a": 1}', '{"a": 2}');
    expect(result?.modified).toBeDefined();
    expect(result?.modified?.a?.before).toBe('1');
    expect(result?.modified?.a?.after).toBe('2');
  });

  test('returns nothing for identical JSON', () => {
    const result = computeSemanticJsonDiff('{"a": 1}', '{"a": 1}');
    expect(result).toBeUndefined();
  });

  test('handles new files', () => {
    const result = computeSemanticJsonDiff(null, '{"a": 1}');
    expect(result?.added).toBeDefined();
  });

  test('returns undefined for invalid JSON', () => {
    const result = computeSemanticJsonDiff('{invalid}', '{}');
    expect(result).toBeUndefined();
  });

  test('detects nested modifications', () => {
    const result = computeSemanticJsonDiff(
      '{"a": {"b": 1}}',
      '{"a": {"b": 2}}'
    );
    expect(result?.modified?.['a.b']).toBeDefined();
  });
});

describe('enhanceDiff', () => {
  test('adds stats, hunks, and semantic to a diff', () => {
    const diff = {
      after: '{"a": 2}',
      before: '{"a": 1}',
      filepath: 'test.json',
    };
    const enhanced = enhanceDiff(diff);
    expect(enhanced.stats).toBeDefined();
    expect(enhanced.stats?.added).toBe(1);
    expect(enhanced.stats?.removed).toBe(1);
    expect(enhanced.hunks).toBeDefined();
    expect(enhanced.hunks?.length).toBe(1);
    expect(enhanced.semantic).toBeDefined();
    expect(enhanced.semantic?.modified?.a).toBeDefined();
  });

  test('skips semantic for non-JSON files', () => {
    const diff = {
      after: 'b',
      before: 'a',
      filepath: 'test.txt',
    };
    const enhanced = enhanceDiff(diff);
    expect(enhanced.semantic).toBeUndefined();
  });

  test('handles new files', () => {
    const diff = { after: '{"x": 1}', before: null, filepath: 'new.json' };
    const enhanced = enhanceDiff(diff);
    expect(enhanced.stats?.added).toBe(1);
    expect(enhanced.stats?.removed).toBe(0);
  });
});

describe('formatDiffHeader', () => {
  test('formats header for existing file', () => {
    const header = formatDiffHeader('src/index.ts', false);
    expect(header).toContain('a/src/index.ts');
    expect(header).toContain('b/src/index.ts');
  });

  test('formats header for new file', () => {
    const header = formatDiffHeader('src/index.ts', true);
    expect(header).toContain('/dev/null');
    expect(header).toContain('b/src/index.ts');
  });
});
