import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect } from 'vite-plus/test';

import { writeTaskDiffs } from '../../packages/tasks/src/factory/ops.js';

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
