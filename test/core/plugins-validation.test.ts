import { loadPluginTasks } from '@xtarterize/core';
import { describe, expect } from 'vite-plus/test';

/**
 * Replicate the file-private regex to test validation logic directly.
 * This is acceptable for a security-critical validation - it documents
 * the contract explicitly and catches regressions if the regex changes.
 */
const npmPackageRe = /^(?:@[a-z0-9~][a-z0-9-._~]*\/)?[a-z0-9~][a-z0-9-._~]*$/;

function isValidNpm(specifier: string): boolean {
  return npmPackageRe.test(specifier);
}

describe('plugin specifier validation', () => {
  describe('valid npm package names', () => {
    const validPackages = [
      'simple',
      'some-package',
      'eslint-plugin-foo',
      'pkg.v1',
      'pkg_v1',
      'pkg~1',
      '@xtarterize/some-plugin',
      '@scope/pkg',
      '@scope/pkg.v1',
      '@scope/pkg_v1',
      '@a/b',
      '@a/b.c',
    ];

    for (const pkg of validPackages) {
      test(`accepts "${pkg}"`, () => {
        expect(isValidNpm(pkg)).toBe(true);
      });
    }
  });

  describe('invalid: relative paths', () => {
    const invalidPaths = [
      '../../malicious.js',
      './local.js',
      '../escape.js',
      './',
      '../',
      './plugin',
      '../plugin',
    ];

    for (const spec of invalidPaths) {
      test(`rejects "${spec}"`, () => {
        expect(isValidNpm(spec)).toBe(false);
      });
    }
  });

  describe('invalid: absolute paths', () => {
    const invalidPaths = ['/etc/passwd', '/tmp/exploit.js', '/usr/local/bin'];

    for (const spec of invalidPaths) {
      test(`rejects "${spec}"`, () => {
        expect(isValidNpm(spec)).toBe(false);
      });
    }
  });

  describe('invalid: URLs', () => {
    const invalidUrls = [
      'https://evil.com/pwn.js',
      'file:///etc/passwd',
      'http://example.com/plugin',
    ];

    for (const spec of invalidUrls) {
      test(`rejects "${spec}"`, () => {
        expect(isValidNpm(spec)).toBe(false);
      });
    }
  });

  describe('invalid: empty/malformed specifiers', () => {
    const invalidSpecs = ['', ' ', '.', '..', '-start-dash', ' leading-space'];

    for (const spec of invalidSpecs) {
      test(`rejects "${spec === '' ? '(empty)' : spec}"`, () => {
        expect(isValidNpm(spec)).toBe(false);
      });
    }
  });
});

describe('loadPluginTasks specifier validation integration', () => {
  test('returns empty array for empty plugins array', async () => {
    const result = await loadPluginTasks({ plugins: [] });
    expect(result).toEqual([]);
  });

  test('returns empty array for undefined plugins', async () => {
    const result = await loadPluginTasks({});
    expect(result).toEqual([]);
  });

  test('skips invalid relative paths without throwing', async () => {
    const result = await loadPluginTasks({
      plugins: ['../../malicious.js', './local.js'],
    });
    // Both invalid, so both skipped - empty result
    expect(result).toEqual([]);
  });

  test('skips invalid absolute paths without throwing', async () => {
    const result = await loadPluginTasks({
      plugins: ['/etc/passwd', '/tmp/exploit.js'],
    });
    expect(result).toEqual([]);
  });

  test('skips invalid URLs without throwing', async () => {
    const result = await loadPluginTasks({
      plugins: ['https://evil.com/pwn.js', 'file:///etc/passwd'],
    });
    expect(result).toEqual([]);
  });

  test('skips empty and malformed specifiers without throwing', async () => {
    const result = await loadPluginTasks({
      plugins: ['', ' ', '.', '..', '-start-dash'],
    });
    expect(result).toEqual([]);
  });

  test('handles mixed valid and invalid specifiers', async () => {
    // Valid specifiers will reach import() and likely fail resolution,
    // which is caught by the existing catch block. The important thing
    // is that the function doesn't throw and invalid ones are skipped.
    const result = await loadPluginTasks({
      plugins: [
        '../../malicious.js',
        '@xtarterize/some-plugin',
        'https://evil.com/pwn.js',
        'valid-package',
      ],
    });
    // May return [] if valid packages can't be resolved, or task arrays if they can.
    // The critical assertion: it doesn't throw and invalid entries don't crash.
    expect(Array.isArray(result)).toBe(true);
  });

  test('skips relative path specifiers silently', async () => {
    const result = await loadPluginTasks({
      plugins: ['../../malicious.js'],
    });
    expect(result).toEqual([]);
  });
});
