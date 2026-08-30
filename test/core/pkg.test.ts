import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { installDependency } from '@xtarterize/core';
import { describe, expect } from 'vite-plus/test';

describe('installDependency', () => {
  test('early-returns when dependency already exists in package.json', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'));
    try {
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({
          devDependencies: { eslint: '^9.0.0' },
          name: 'test-pkg',
        })
      );
      // Should resolve (not throw) because eslint is already listed
      await expect(
        installDependency(tmpDir, 'eslint', true)
      ).resolves.toBeUndefined();
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('throws on installation failure', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'));
    try {
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({
          name: 'test-pkg',
        })
      );
      // nypm will fail because there's no real package manager context in tests
      await expect(
        installDependency(tmpDir, 'nonexistent-package-that-will-fail', true)
      ).rejects.toThrow(/nonexistent-package-that-will-fail/);
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('does not fail package-manager detection on lockfile-less projects', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'));
    try {
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({
          name: 'test-pkg',
        })
      );
      // No lockfile: nypm would fail auto-detection, but xtarterize passes the
      // npm fallback, so any failure must come from npm itself instead.
      try {
        await installDependency(
          tmpDir,
          'nonexistent-package-that-will-fail',
          true
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        expect(message).not.toContain('No package manager auto-detected');
      }
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });
});
