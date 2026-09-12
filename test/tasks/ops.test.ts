import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { type ProjectProfile, TaskError } from '@xtarterize/core';
import { Effect } from 'effect';
import { describe, expect } from 'vite-plus/test';

import { defineTask } from '../../packages/tasks/src/factory/define-task.js';
import { writeTaskDiffs } from '../../packages/tasks/src/factory/ops.js';
import { run } from '../helpers/run.js';

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

describe('defineTask failure labeling', () => {
  const profile = {} as ProjectProfile;

  test('labels plain spec failures with the entry method', async () => {
    const task = defineTask({
      applicable: () => true,
      group: 'Test',
      id: 'test/labels',
      label: 'Labels',
      targets: () => {
        throw new Error('targets-boom');
      },
    });

    await expect(run(task.check('/tmp', profile))).rejects.toThrow(
      'defineTask.check failed: Error: targets-boom'
    );
    await expect(run(task.dryRun('/tmp', profile))).rejects.toThrow(
      'defineTask.dryRun failed: Error: targets-boom'
    );
    await expect(run(task.apply('/tmp', profile))).rejects.toThrow(
      'defineTask.apply failed: Error: targets-boom'
    );
    await expect(run(task.getDeps('/tmp', profile))).rejects.toThrow(
      'defineTask.getDeps failed: Error: targets-boom'
    );
  });

  test('keeps a spec Effect failure labeled with its TaskError', async () => {
    const task = defineTask({
      actions: [
        {
          check: () => 'skip',
          run: () => Effect.fail(new TaskError({ message: 'effect-boom' })),
        },
      ],
      applicable: () => true,
      group: 'Test',
      id: 'test/effect-labels',
      label: 'Effect labels',
    });

    await expect(run(task.apply('/tmp', profile))).rejects.toThrow(
      'defineTask.apply failed: TaskError: effect-boom'
    );
  });
});
