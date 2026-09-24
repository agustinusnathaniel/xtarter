import fs from 'node:fs/promises';
import path from 'node:path';
import { withTempDir } from '@test/helpers/temp.js';
import {
  BackupError,
  backupFile,
  listBackups,
  readRunManifest,
  restoreBackup,
  writeRunManifest,
} from '@xtarterize/core';
import { describe, expect } from 'vite-plus/test';

describe('backup', () => {
  test('recovers when backup index is malformed', async () => {
    await withTempDir('xtarterize-backup-', async (tmpDir) => {
      await fs.writeFile(path.join(tmpDir, 'foo.txt'), 'before', 'utf-8');

      const backupDir = path.join(tmpDir, '.xtarterize', 'backups');
      await fs.mkdir(backupDir, { recursive: true });
      await fs.writeFile(
        path.join(backupDir, '.index.json'),
        '{broken',
        'utf-8'
      );

      await backupFile(tmpDir, 'foo.txt');
      const backups = await listBackups(tmpDir, 'foo.txt');

      expect(backups.length).toBe(1);
      expect(backups[0]?.filepath).toBe('foo.txt');
    });
  });

  test('backupFile handles non-existent source file gracefully', async () => {
    await withTempDir('xtarterize-nonexistent-', async (tmpDir) => {
      await expect(
        backupFile(tmpDir, 'nonexistent.txt')
      ).resolves.toBeUndefined();
    });
  });
});

describe('run manifest', () => {
  test('writes and reads a run manifest', async () => {
    await withTempDir('xtarterize-manifest-', async (tmpDir) => {
      await writeRunManifest(tmpDir, ['tsconfig.json', 'biome.json']);
      const manifest = await readRunManifest(tmpDir);

      expect(manifest).not.toBeNull();
      expect(manifest?.files).toEqual(['tsconfig.json', 'biome.json']);
      expect(manifest?.timestamp).toBeTruthy();
    });
  });

  test('wraps raw write failures in BackupError with the original message', async () => {
    await withTempDir('xtarterize-manifest-failure-', async (tmpDir) => {
      // A file where the backup directory should be makes mkdir reject.
      await fs.writeFile(path.join(tmpDir, '.xtarterize'), 'blocked', 'utf-8');

      let failure: unknown;
      try {
        await writeRunManifest(tmpDir, ['tsconfig.json']);
      } catch (cause) {
        failure = cause;
      }

      expect(failure).toBeInstanceOf(BackupError);
      if (!(failure instanceof BackupError)) {
        throw new Error('writeRunManifest did not reject with BackupError');
      }
      expect(failure.path).toBe(
        path.join(tmpDir, '.xtarterize', 'backups', 'last-run.json')
      );
      const cause = failure.cause;
      expect(failure.message).toBe(
        cause instanceof Error ? cause.message : String(cause)
      );
      expect(failure.message.length).toBeGreaterThan(0);
    });
  });
});

describe('restoreBackup security', () => {
  test('restoreBackup with traversal path throws BackupError', async () => {
    await withTempDir('xtarterize-traversal-', async (tmpDir) => {
      const traversalBackup = {
        backupPath: path.join(tmpDir, '.xtarterize', 'backups', 'some-backup'),
        filepath: '../../../etc/passwd',
        timestamp: new Date().toISOString(),
      };

      await expect(restoreBackup(tmpDir, traversalBackup)).rejects.toThrow(
        BackupError
      );
    });
  });

  test('restoreBackup with source path traversal throws BackupError', async () => {
    await withTempDir('xtarterize-source-traversal-', async (tmpDir) => {
      const traversalBackup = {
        backupPath: '../../../etc/passwd',
        filepath: 'target.txt',
        timestamp: new Date().toISOString(),
      };

      await expect(restoreBackup(tmpDir, traversalBackup)).rejects.toThrow(
        BackupError
      );
    });
  });
});
