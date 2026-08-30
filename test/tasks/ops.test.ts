import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  ensureTaskDependency,
  ensureTaskParentDir,
  writeTaskDiffs,
} from '@xtarterize/tasks';
import { describe, expect } from 'vite-plus/test';

describe('ensureTaskParentDir', () => {
  test('creates parent directory for nested path', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'));
    try {
      await ensureTaskParentDir(tmpDir, 'a/b/c.txt');
      const stat = await fs.stat(path.join(tmpDir, 'a', 'b'));
      expect(stat.isDirectory()).toBe(true);
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('does not error when parent already exists', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'));
    try {
      await fs.mkdir(path.join(tmpDir, 'existing'), { recursive: true });
      await expect(
        ensureTaskParentDir(tmpDir, 'existing/file.txt')
      ).resolves.toBeUndefined();
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });
});

describe('writeTaskDiffs', () => {
  test('writes file diffs to disk', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'));
    try {
      await writeTaskDiffs(tmpDir, [
        { after: 'hello', before: null, filepath: 'test.txt' },
      ]);
      const content = await fs.readFile(path.join(tmpDir, 'test.txt'), 'utf-8');
      expect(content).toBe('hello');
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('creates intermediate directories', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'));
    try {
      await writeTaskDiffs(tmpDir, [
        { after: 'content', before: null, filepath: 'nested/dir/file.txt' },
      ]);
      const stat = await fs.stat(path.join(tmpDir, 'nested', 'dir'));
      expect(stat.isDirectory()).toBe(true);
      const content = await fs.readFile(
        path.join(tmpDir, 'nested', 'dir', 'file.txt'),
        'utf-8'
      );
      expect(content).toBe('content');
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });
});

describe('ensureTaskDependency', () => {
  test('returns early when depName is not set', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'));
    try {
      await expect(
        ensureTaskDependency({ cwd: tmpDir })
      ).resolves.toBeUndefined();
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('returns early when dependency exists in package.json', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'));
    try {
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({
          devDependencies: { execa: '^9.0.0' },
          name: 'test',
        })
      );
      await expect(
        ensureTaskDependency({ cwd: tmpDir, depName: 'execa' })
      ).resolves.toBeUndefined();
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('returns early when dependency exists in dependencies', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'));
    try {
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({
          dependencies: { execa: '^9.0.0' },
          name: 'test',
        })
      );
      await expect(
        ensureTaskDependency({ cwd: tmpDir, depName: 'execa' })
      ).resolves.toBeUndefined();
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('returns early when no package.json exists', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'));
    try {
      await expect(
        ensureTaskDependency({ cwd: tmpDir, depName: 'execa' })
      ).resolves.toBeUndefined();
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });
});

describe('ensureTaskDependency error propagation', () => {
  test('throws when installDependency fails', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'));
    try {
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({
          name: 'test',
          private: true,
        })
      );

      await expect(
        ensureTaskDependency({
          cwd: tmpDir,
          depName: 'this-package-definitely-does-not-exist-12345',
        })
      ).rejects.toThrow();
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('error message includes the dependency name', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'));
    try {
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({
          name: 'test',
          private: true,
        })
      );

      await expect(
        ensureTaskDependency({
          cwd: tmpDir,
          depName: 'this-package-definitely-does-not-exist-12345',
        })
      ).rejects.toThrow(/this-package-definitely-does-not-exist-12345/);
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });
});
