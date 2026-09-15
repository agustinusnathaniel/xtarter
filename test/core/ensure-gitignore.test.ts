import fs from 'node:fs/promises';
import path from 'node:path';
import { ensureXtarterizeGitignore } from '@xtarterize/core';
import { describe, expect } from 'vite-plus/test';

import { withTempDir } from '../helpers/temp.js';

const HEADER = '# xtarterize internal artifacts';
const ENTRY = '/.xtarterize/';

function gitignorePath(dir: string): string {
  return path.join(dir, '.gitignore');
}

describe('ensureXtarterizeGitignore', () => {
  test('creates .gitignore with header and entry when file does not exist', async () => {
    await withTempDir('xtarterize-', async (tmpDir) => {
      const result = await ensureXtarterizeGitignore(tmpDir);

      expect(result).toEqual({ action: 'created' });
      const content = await fs.readFile(gitignorePath(tmpDir), 'utf-8');
      expect(content).toBe(`${HEADER}\n${ENTRY}\n`);
    });
  });

  test('returns noop when .gitignore already contains the entry', async () => {
    await withTempDir('xtarterize-', async (tmpDir) => {
      await fs.writeFile(
        gitignorePath(tmpDir),
        `${HEADER}\n${ENTRY}\n`,
        'utf-8'
      );

      const result = await ensureXtarterizeGitignore(tmpDir);

      expect(result).toEqual({ action: 'noop' });
      // File content should be unchanged
      const content = await fs.readFile(gitignorePath(tmpDir), 'utf-8');
      expect(content).toBe(`${HEADER}\n${ENTRY}\n`);
    });
  });

  test('returns noop when entry appears mid-file (not only standalone)', async () => {
    await withTempDir('xtarterize-', async (tmpDir) => {
      await fs.writeFile(
        gitignorePath(tmpDir),
        `node_modules\n${ENTRY}\ndist\n`,
        'utf-8'
      );

      const result = await ensureXtarterizeGitignore(tmpDir);

      expect(result).toEqual({ action: 'noop' });
    });
  });
});

describe('ensureXtarterizeGitignore', () => {
  test('appends header and entry to existing .gitignore missing the entry', async () => {
    await withTempDir('xtarterize-', async (tmpDir) => {
      await fs.writeFile(
        gitignorePath(tmpDir),
        'node_modules\ndist\n.env\n',
        'utf-8'
      );

      const result = await ensureXtarterizeGitignore(tmpDir);

      expect(result).toEqual({ action: 'appended' });
      const content = await fs.readFile(gitignorePath(tmpDir), 'utf-8');
      expect(content).toBe(`node_modules\ndist\n.env\n${HEADER}\n${ENTRY}\n`);
    });
  });

  test('appends correctly when .gitignore ends without trailing newline', async () => {
    await withTempDir('xtarterize-', async (tmpDir) => {
      await fs.writeFile(gitignorePath(tmpDir), 'node_modules\ndist', 'utf-8');

      const result = await ensureXtarterizeGitignore(tmpDir);

      expect(result).toEqual({ action: 'appended' });
      const content = await fs.readFile(gitignorePath(tmpDir), 'utf-8');
      expect(content).toBe(`node_modules\ndist\n${HEADER}\n${ENTRY}\n`);
    });
  });

  test('appends to an empty .gitignore file', async () => {
    await withTempDir('xtarterize-', async (tmpDir) => {
      await fs.writeFile(gitignorePath(tmpDir), '', 'utf-8');

      const result = await ensureXtarterizeGitignore(tmpDir);

      expect(result).toEqual({ action: 'appended' });
      const content = await fs.readFile(gitignorePath(tmpDir), 'utf-8');
      expect(content).toBe(`\n${HEADER}\n${ENTRY}\n`);
    });
  });
});

describe('ensureXtarterizeGitignore', () => {
  test('preserves existing content when appending', async () => {
    await withTempDir('xtarterize-', async (tmpDir) => {
      await fs.writeFile(
        gitignorePath(tmpDir),
        'node_modules\n.env\n',
        'utf-8'
      );

      await ensureXtarterizeGitignore(tmpDir);
      // Call twice to verify idempotency
      const result = await ensureXtarterizeGitignore(tmpDir);

      expect(result).toEqual({ action: 'noop' });
      const content = await fs.readFile(gitignorePath(tmpDir), 'utf-8');
      expect(content).toBe(`node_modules\n.env\n${HEADER}\n${ENTRY}\n`);
    });
  });

  test('returns noop on read permission error', async () => {
    await withTempDir('xtarterize-', async (tmpDir) => {
      // Create a directory in place of .gitignore so readFile fails with EISDIR
      await fs.mkdir(gitignorePath(tmpDir), { recursive: true });

      const result = await ensureXtarterizeGitignore(tmpDir);

      expect(result).toEqual({ action: 'noop' });
    });
  });

  test('returns noop on write permission error (read-only file)', async () => {
    await withTempDir('xtarterize-', async (tmpDir) => {
      const gp = gitignorePath(tmpDir);
      await fs.writeFile(gp, 'some content', 'utf-8');
      // Remove write permission so writeFile fails with EACCES
      await fs.chmod(gp, 0o444);

      const result = await ensureXtarterizeGitignore(tmpDir);
      expect(result).toEqual({ action: 'noop' });

      // Restore permissions so cleanup works
      await fs.chmod(gp, 0o644);
    });
  });
});
