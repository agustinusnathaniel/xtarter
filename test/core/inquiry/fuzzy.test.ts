import { similarity } from '@xtarterize/core';
import { describe, expect } from 'vite-plus/test';

describe('similarity', () => {
  test('is 1 for identical strings, including two empty strings', () => {
    expect(similarity('strict', 'strict')).toBe(1.0);
    expect(similarity('', '')).toBe(1.0);
  });

  test('is 0 for completely different strings of equal length', () => {
    expect(similarity('abc', 'xyz')).toBe(0);
  });

  test('is case-insensitive', () => {
    expect(similarity('TYPESCRIPT', 'typescript')).toBe(1.0);
  });

  test('scores closer strings higher', () => {
    expect(similarity('lint', 'linter')).toBeGreaterThan(
      similarity('lint', 'build')
    );
  });
});
