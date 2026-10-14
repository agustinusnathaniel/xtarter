import { describe, expect } from 'vite-plus/test';

import { stem } from '../../../packages/core/src/inquiry/stemmer.js';

// Stems only need to make inflections of one word match each other; the exact
// stem string for words with suffixes is an implementation detail.
describe('stem', () => {
  test('leaves simple words unchanged', () => {
    expect(stem('task')).toBe('task');
    expect(stem('vscode')).toBe('vscode');
  });

  test('maps inflected forms onto the base word', () => {
    expect(stem('tasks')).toBe(stem('task'));
    expect(stem('testing')).toBe(stem('test'));
    expect(stem('tested')).toBe(stem('test'));
    expect(stem('installed')).toBe(stem('install'));
  });

  test('maps -ies plurals onto the singular form', () => {
    expect(stem('libraries')).toBe('library');
    expect(stem('dependencies')).toBe('dependency');
  });

  test('is case-insensitive', () => {
    expect(stem('Libraries')).toBe(stem('libraries'));
  });

  test('never stems a word to an empty string', () => {
    expect(stem('ing')).toBe('ing');
  });
});
