import { describe, expect } from 'vite-plus/test';

import {
  areEquivalent,
  extractTool,
  findEquivalentScriptKey,
  hasScriptWithEquivalentValue,
  normalizeCommand,
} from '../../packages/tasks/src/factory/equivalence.js';

describe('normalizeCommand', () => {
  test('trims and collapses whitespace', () => {
    expect(normalizeCommand('  tsc   --noEmit  ')).toBe('tsc --noEmit');
  });

  test('is identity for already-normal commands', () => {
    expect(normalizeCommand('tsc --noEmit')).toBe('tsc --noEmit');
  });
});

describe('extractTool', () => {
  test('extracts known tool from command', () => {
    expect(extractTool('tsc --noEmit')).toBe('tsc');
  });

  test('extracts tool after npx runner', () => {
    expect(extractTool('npx tsc')).toBe('tsc');
  });

  test('extracts script ref from pm run pattern', () => {
    expect(extractTool('pnpm run build')).toBe('build');
  });

  test('returns null for empty string', () => {
    expect(extractTool('')).toBeNull();
  });

  test('returns null for unknown command', () => {
    expect(extractTool('some-random-tool')).toBeNull();
  });
});

describe('findEquivalentScriptKey', () => {
  test('returns key when exact value match exists', () => {
    const scripts = { build: 'tsc --noEmit' };
    expect(findEquivalentScriptKey(scripts, 'tsc --noEmit')).toBe('build');
  });

  test('returns null when scripts object is empty', () => {
    expect(findEquivalentScriptKey({}, 'tsc')).toBeNull();
  });

  test('returns null when no equivalent value exists', () => {
    const scripts = { build: 'tsc' };
    expect(findEquivalentScriptKey(scripts, 'eslint .')).toBeNull();
  });

  test('finds equivalent via release tool aliases', () => {
    const scripts = { rel: 'standard-version' };
    expect(findEquivalentScriptKey(scripts, 'commit-and-tag-version')).toBe(
      'rel'
    );
  });

  test('finds equivalent via script ref match', () => {
    const scripts = { build: 'npm run build' };
    expect(findEquivalentScriptKey(scripts, 'pnpm run build')).toBe('build');
  });
});

describe('hasScriptWithEquivalentValue', () => {
  test('returns true when exact value exists', () => {
    expect(
      hasScriptWithEquivalentValue({ build: 'tsc --noEmit' }, 'tsc --noEmit')
    ).toBe(true);
  });

  test('returns false when no equivalent value exists', () => {
    expect(hasScriptWithEquivalentValue({ build: 'tsc' }, 'eslint .')).toBe(
      false
    );
  });

  test('returns true when equivalent via tool aliases', () => {
    expect(
      hasScriptWithEquivalentValue(
        { release: 'standard-version' },
        'commit-and-tag-version'
      )
    ).toBe(true);
  });
});

const equivalenceCases: Array<
  [rule: string, name: string, left: string, right: string, expected: boolean]
> = [
  [
    'EXACT_MATCH rule',
    'returns true for identical commands',
    'tsc --noEmit',
    'tsc --noEmit',
    true,
  ],
  [
    'EXACT_MATCH rule',
    'returns true for identical simple commands',
    'tsc',
    'tsc',
    true,
  ],
  [
    'COMPOSITE rules',
    'returns true when both are composite with same tasks',
    'turbo run build lint',
    'turbo run build lint',
    true,
  ],
  [
    'COMPOSITE rules',
    'returns false when composite mixed with non-composite',
    'turbo run build',
    'tsc --noEmit',
    false,
  ],
  [
    'COMPOSITE rules',
    'returns false for turborepo variants whose tasks cannot be extracted',
    'turborepo run a',
    'turborepo run b',
    false,
  ],
  [
    'COMPOSITE rules',
    'keeps exact matches for non-extractable composite variants',
    'turborepo run a',
    'turborepo run a',
    true,
  ],
  [
    'SHELL_OPERATOR_MISMATCH rule',
    'returns false when one has shell operator and other does not',
    'lint && format',
    'lint',
    false,
  ],
  [
    'SHELL_OPERATOR_MISMATCH rule',
    'returns false in reverse order',
    'lint',
    'lint && format',
    false,
  ],
  [
    'TOOL_MISMATCH rule',
    'returns false for completely different tools',
    'tsc --noEmit',
    'eslint .',
    false,
  ],
  [
    'TOOL_MISMATCH rule',
    'returns false even when tools normalize to same category but args differ',
    'eslint .',
    'biome check .',
    false,
  ],
  [
    'SAME_TOOL_SAME_ARGS rule',
    'returns true for functionally equivalent release tools',
    'commit-and-tag-version',
    'standard-version',
    true,
  ],
  [
    'SAME_TOOL_SAME_ARGS rule',
    'returns true for release-it vs standard-version',
    'release-it',
    'standard-version',
    true,
  ],
  [
    'EQUIVALENT_SUBCOMMANDS rule',
    'detects equivalent biome subcommands',
    'biome check .',
    'biome lint .',
    true,
  ],
  [
    'EQUIVALENT_SUBCOMMANDS rule',
    'detects equivalent biome subcommands with --write',
    'biome check --write .',
    'biome format --write .',
    true,
  ],
  [
    'EQUIVALENT_SUBCOMMANDS rule',
    'detects equivalent ultracite subcommands',
    'ultracite check',
    'ultracite fix',
    true,
  ],
  [
    'EQUIVALENT_SUBCOMMANDS rule',
    'detects equivalent vp subcommands',
    'vp lint',
    'vp check',
    true,
  ],
  [
    'SCRIPT_REF_MATCH rule',
    'returns true when both reference the same script name',
    'pnpm run build',
    'npm run build',
    true,
  ],
  [
    'SCRIPT_REF_MATCH rule',
    'returns false when script refs differ',
    'pnpm run build',
    'pnpm run test',
    false,
  ],
  [
    'non-equivalent cases',
    'returns false for different commands with same tool but different args',
    'tsc --noEmit',
    'tsc --build',
    false,
  ],
  [
    'non-equivalent cases',
    'returns false for completely unrelated commands',
    'echo hello',
    'ls -la',
    false,
  ],
];

describe('areEquivalent', () => {
  const rules = new Map<
    string,
    Array<[name: string, left: string, right: string, expected: boolean]>
  >();
  for (const [rule, name, left, right, expected] of equivalenceCases) {
    const rows = rules.get(rule) ?? [];
    rows.push([name, left, right, expected]);
    rules.set(rule, rows);
  }

  for (const [rule, rows] of rules) {
    describe(rule, () => {
      for (const [name, left, right, expected] of rows) {
        test(name, () => {
          expect(areEquivalent(left, right)).toBe(expected);
        });
      }
    });
  }
});
