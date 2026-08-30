import { lintToolScripts, resolveLintTool } from '@xtarterize/tasks';
import { describe, expect } from 'vite-plus/test';

describe('resolveLintTool', () => {
  test('returns null when eslint is present', () => {
    expect(
      resolveLintTool({
        existingEslint: true,
        existingOxfmt: false,
        existingOxlint: false,
        hasBiomeDep: false,
        useUltracite: false,
        vitePlus: false,
      })
    ).toBeNull();
  });

  test('returns ultracite when present', () => {
    expect(
      resolveLintTool({
        existingEslint: false,
        existingOxfmt: false,
        existingOxlint: false,
        hasBiomeDep: false,
        useUltracite: true,
        vitePlus: false,
      })
    ).toBe('ultracite');
  });

  test('returns biome when dep is present', () => {
    expect(
      resolveLintTool({
        existingEslint: false,
        existingOxfmt: false,
        existingOxlint: false,
        hasBiomeDep: true,
        useUltracite: false,
        vitePlus: false,
      })
    ).toBe('biome');
  });

  test('returns oxlint when oxlint config exists', () => {
    expect(
      resolveLintTool({
        existingEslint: false,
        existingOxfmt: false,
        existingOxlint: true,
        hasBiomeDep: false,
        useUltracite: false,
        vitePlus: false,
      })
    ).toBe('oxlint');
  });

  test('returns oxlint when oxfmt config exists', () => {
    expect(
      resolveLintTool({
        existingEslint: false,
        existingOxfmt: true,
        existingOxlint: false,
        hasBiomeDep: false,
        useUltracite: false,
        vitePlus: false,
      })
    ).toBe('oxlint');
  });

  test('returns vp when only vitePlus is true', () => {
    expect(
      resolveLintTool({
        existingEslint: false,
        existingOxfmt: false,
        existingOxlint: false,
        hasBiomeDep: false,
        useUltracite: false,
        vitePlus: true,
      })
    ).toBe('vp');
  });

  test('defaults to biome when nothing is configured', () => {
    expect(
      resolveLintTool({
        existingEslint: false,
        existingOxfmt: false,
        existingOxlint: false,
        hasBiomeDep: false,
        useUltracite: false,
        vitePlus: false,
      })
    ).toBe('biome');
  });

  test('ultracite takes priority over biome dep', () => {
    expect(
      resolveLintTool({
        existingEslint: false,
        existingOxfmt: false,
        existingOxlint: false,
        hasBiomeDep: true,
        useUltracite: true,
        vitePlus: false,
      })
    ).toBe('ultracite');
  });
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
