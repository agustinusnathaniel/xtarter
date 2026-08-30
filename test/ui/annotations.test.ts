import type { DiagnosticCheck, Task, TaskStatus } from '@xtarterize/core';
import { describe, expect } from 'vite-plus/test';

import { formatCheckAnnotations } from '../../apps/xtarterize/src/ui/annotations.js';

function makeTask(
  id: string,
  label: string,
  configTargets?: Array<string>
): Task {
  return {
    applicable: () => true,
    apply: async () => {},
    check: async () => 'skip' as const,
    dryRun: async () => [],
    group: 'test',
    id,
    label,
    searchMeta: configTargets
      ? { configTargets, keywords: [], tags: [] }
      : undefined,
  };
}

function makeStatuses(
  entries: Array<[string, TaskStatus]>
): Map<string, TaskStatus> {
  return new Map(entries);
}

describe('formatCheckAnnotations', () => {
  test('emits error annotation per non-conformant task with file target', () => {
    const tasks = [
      makeTask('ts/strict', 'Strict TypeScript', ['tsconfig.json']),
    ];
    const statuses = makeStatuses([['ts/strict', 'patch']]);

    const output = formatCheckAnnotations(tasks, statuses, []);

    expect(output).toContain(
      '::error file=tsconfig.json,title=Strict TypeScript::ts/strict is patch'
    );
  });

  test('omits conformant tasks', () => {
    const tasks = [
      makeTask('ts/strict', 'Strict TypeScript', ['tsconfig.json']),
    ];
    const statuses = makeStatuses([['ts/strict', 'skip']]);

    const output = formatCheckAnnotations(tasks, statuses, []);

    expect(output).not.toContain('ts/strict');
    expect(formatCheckAnnotations([], new Map(), [])).toBe('');
  });

  test('uses configTargets[0] as file', () => {
    const tasks = [
      makeTask('ts/strict', 'Strict TypeScript', [
        'tsconfig.json',
        'package.json',
      ]),
    ];
    const statuses = makeStatuses([['ts/strict', 'new']]);

    const output = formatCheckAnnotations(tasks, statuses, []);

    expect(output).toContain('file=tsconfig.json');
    expect(output).not.toContain('package.json');
  });

  test('omits file when no configTargets', () => {
    const tasks = [makeTask('ts/strict', 'Strict TypeScript')];
    const statuses = makeStatuses([['ts/strict', 'patch']]);

    const output = formatCheckAnnotations(tasks, statuses, []);

    expect(output).toMatch(/^::error title=Strict TypeScript::/);
  });

  test('maps fail diagnostic to error and warn to warning', () => {
    const diagnostics: Array<DiagnosticCheck> = [
      { message: 'Biome + ESLint', name: 'Conflict', status: 'fail' },
      { message: 'missing', name: 'Tools', status: 'warn' },
      { message: 'ok', name: 'Passing', status: 'pass' },
    ];

    const output = formatCheckAnnotations([], new Map(), diagnostics);

    expect(output).toContain('::error title=Conflict::Biome + ESLint');
    expect(output).toContain('::warning title=Tools::missing');
    expect(output).not.toContain('Passing');
  });

  test('escapes property and data values', () => {
    const tasks = [makeTask('ts/strict', 'A:B, C%', ['tsconfig.json'])];
    const statuses = makeStatuses([['ts/strict', 'patch']]);
    const diagnostics: Array<DiagnosticCheck> = [
      { message: '100% done\nnext', name: 'Tool', status: 'fail' },
    ];

    const output = formatCheckAnnotations(tasks, statuses, diagnostics);

    expect(output).toContain('title=A%3AB%2C C%25');
    expect(output).toContain('100%25 done%0Anext');
    expect(output).not.toContain('A:B, C%');
    expect(output).not.toContain('100% done\n');
  });

  test('annotations join with newline', () => {
    const tasks = [
      makeTask('ts/strict', 'Strict TypeScript', ['tsconfig.json']),
      makeTask('lint/biome', 'Biome', ['biome.json']),
    ];
    const statuses = makeStatuses([
      ['ts/strict', 'patch'],
      ['lint/biome', 'new'],
    ]);

    const output = formatCheckAnnotations(tasks, statuses, []);

    const lines = output.split('\n');
    expect(lines).toHaveLength(2);
    expect(output).not.toMatch(/\n$/);
  });
});
