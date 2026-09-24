import fs from 'node:fs/promises';
import path from 'node:path';
import { fixtureDir } from '@test/helpers/project.js';
import { withTempDir } from '@test/helpers/temp.js';
import { runPreflight } from '@xtarterize/core';
import { describe, expect } from 'vite-plus/test';

describe('runPreflight', () => {
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
