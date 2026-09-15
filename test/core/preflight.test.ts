import fs from 'node:fs/promises';
import path from 'node:path';
import { fixtureDir } from '@test/helpers/project.js';
import { withTempDir } from '@test/helpers/temp.js';
import { runPreflight } from '@xtarterize/core';
import { describe, expect } from 'vite-plus/test';

describe('runPreflight', () => {
  test('passes for valid project with git', async () => {
    await withTempDir('xtarterize-preflight-', async (tmpDir) => {
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ name: 'test-project' })
      );
      await fs.mkdir(path.join(tmpDir, '.git'));
      const result = await runPreflight(tmpDir);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  test('fails when package.json is missing', async () => {
    const result = await runPreflight(
      path.join(fixtureDir('monorepo-turbo'), 'apps')
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe('MISSING_PACKAGE_JSON');
  });

  test('fails when .git is missing', async () => {
    const result = await runPreflight(fixtureDir('nextjs'));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'MISSING_GIT')).toBe(true);
  });

  test('fails when package.json has no name', async () => {
    await withTempDir('xtarterize-preflight-invalid-', async (tmpDir) => {
      await fs.writeFile(path.join(tmpDir, 'package.json'), '{}');

      const result = await runPreflight(tmpDir);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: 'INVALID_PACKAGE_JSON' })
      );
    });
  });
});
