import { similarity } from '@xtarterize/core';
import { describe, expect } from 'vite-plus/test';

import { levenshtein } from '../../../packages/core/src/inquiry/fuzzy.js';

describe('levenshtein', () => {
  test('returns 0 for identical strings', () => {
    expect(levenshtein('hello', 'hello')).toBe(0);
    expect(levenshtein('', '')).toBe(0);
    expect(levenshtein('a', 'a')).toBe(0);
  });

  test('returns correct distance for single character changes', () => {
    expect(levenshtein('cat', 'cats')).toBe(1);
    expect(levenshtein('cat', 'cut')).toBe(1);
    expect(levenshtein('cat', 'at')).toBe(1);
  });

  test('returns length of non-empty string when other is empty', () => {
    expect(levenshtein('', 'hello')).toBe(5);
    expect(levenshtein('hello', '')).toBe(5);
  });

  test('computes full edit distance correctly', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
    expect(levenshtein('saturday', 'sunday')).toBe(3);
    expect(levenshtein('biome', 'biome.json')).toBe(5);
  });
});

describe('similarity', () => {
  test('returns 1.0 for identical strings', () => {
    expect(similarity('hello', 'hello')).toBe(1.0);
    expect(similarity('strict', 'strict')).toBe(1.0);
  });

  test('returns 0.0 for completely different strings of equal length', () => {
    expect(similarity('abc', 'xyz')).toBe(0);
  });

  test('returns 1.0 when both strings are empty', () => {
    expect(similarity('', '')).toBe(1.0);
  });

  test('returns values between 0 and 1 for partial matches', () => {
    const score = similarity('lint', 'linter');
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1.0);
  });

  test('is case-insensitive', () => {
    expect(similarity('Strict', 'strict')).toBe(1.0);
    expect(similarity('TYPESCRIPT', 'typescript')).toBe(1.0);
  });

  test('returns higher scores for more similar strings', () => {
    expect(similarity('lint', 'linter')).toBeGreaterThan(
      similarity('lint', 'build')
    );
    expect(similarity('test', 'testing')).toBeGreaterThan(
      similarity('test', 'deploy')
    );
  });
});
