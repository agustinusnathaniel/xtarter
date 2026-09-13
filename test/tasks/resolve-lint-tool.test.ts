import { describe, expect } from 'vite-plus/test';

import {
  type LintTool,
  lintToolScripts,
  resolveLintTool,
} from '../../packages/tasks/src/factory/package-scripts.js';

type ResolveLintToolInput = Parameters<typeof resolveLintTool>[0];

const defaultInput: ResolveLintToolInput = {
  existingEslint: false,
  existingOxfmt: false,
  existingOxlint: false,
  hasBiomeDep: false,
  useUltracite: false,
  vitePlus: false,
};

const lintToolCases: Array<
  [
    name: string,
    input: Partial<ResolveLintToolInput>,
    expected: LintTool | null,
  ]
> = [
  ['returns null when eslint is present', { existingEslint: true }, null],
  ['returns ultracite when present', { useUltracite: true }, 'ultracite'],
  ['returns biome when dep is present', { hasBiomeDep: true }, 'biome'],
  [
    'returns oxlint when oxlint config exists',
    { existingOxlint: true },
    'oxlint',
  ],
  [
    'returns oxlint when oxfmt config exists',
    { existingOxfmt: true },
    'oxlint',
  ],
  ['returns vp when only vitePlus is true', { vitePlus: true }, 'vp'],
  ['defaults to biome when nothing is configured', {}, 'biome'],
  [
    'ultracite takes priority over biome dep',
    { hasBiomeDep: true, useUltracite: true },
    'ultracite',
  ],
];

describe('resolveLintTool', () => {
  for (const [name, input, expected] of lintToolCases) {
    test(name, () => {
      expect(resolveLintTool({ ...defaultInput, ...input })).toBe(expected);
    });
  }
});

describe('lintToolScripts', () => {
  test('returns empty array for null tool', () => {
    expect(lintToolScripts(null, '')).toEqual([]);
  });

  test('returns ultracite scripts', () => {
    const scripts = lintToolScripts('ultracite', '');
    expect(scripts).toContainEqual({
      script: 'ultracite:check',
      value: 'ultracite check',
    });
    expect(scripts).toContainEqual({
      script: 'ultracite:fix',
      value: 'ultracite fix',
    });
  });

  test('returns biome scripts', () => {
    const scripts = lintToolScripts('biome', '');
    expect(scripts).toContainEqual({ script: 'biome', value: 'biome check .' });
    expect(scripts).toContainEqual({
      script: 'biome:fix',
      value: 'biome check --write .',
    });
  });

  test('returns oxlint scripts with plugins', () => {
    const scripts = lintToolScripts('oxlint', '--import-plugin --react-plugin');
    expect(scripts).toContainEqual({
      script: 'lint',
      value: 'oxlint --import-plugin --react-plugin',
    });
    expect(scripts).toContainEqual({
      script: 'check',
      value: 'oxlint --import-plugin --react-plugin && oxfmt --check',
    });
    expect(scripts).toContainEqual({
      script: 'fix',
      value: 'oxlint --fix --import-plugin --react-plugin && oxfmt',
    });
  });

  test('returns vp scripts', () => {
    const scripts = lintToolScripts('vp', '');
    expect(scripts).toContainEqual({ script: 'lint', value: 'vp lint' });
    expect(scripts).toContainEqual({ script: 'check', value: 'vp check' });
    expect(scripts).toContainEqual({ script: 'fix', value: 'vp check --fix' });
  });
});
