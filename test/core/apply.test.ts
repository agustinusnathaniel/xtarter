import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyTasks, detectProject } from '@xtarterize/core';
import { describe, expect } from 'vite-plus/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('applyTasks', () => {
  test('applies a single task successfully', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-apply-')
    );
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'test', version: '1.0.0' })
    );

    const profile = await detectProject(tmpDir);
    const mockTask = {
      applicable: () => true,
      apply: async () => {
        await fs.writeFile(path.join(tmpDir, 'test.txt'), 'hello');
      },
      check: async () => 'new' as const,
      dryRun: async () => [
        { after: 'hello', before: null, filepath: 'test.txt' },
      ],
      group: 'Test',
      id: 'mock/task',
      label: 'Mock Task',
    };

    const result = await applyTasks({
      cwd: tmpDir,
      profile,
      tasks: [mockTask],
    });
    expect(result.errors).toHaveLength(0);
    expect(result.applied).toBe(1);

    await fs.rm(tmpDir, { recursive: true });
  });

  test('skips tasks that are already applied', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-skip-'));
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'test', version: '1.0.0' })
    );
    await fs.writeFile(path.join(tmpDir, 'test.txt'), 'hello');

    const profile = await detectProject(tmpDir);
    const mockTask = {
      applicable: () => true,
      apply: async () => {},
      check: async () => 'skip' as const,
      dryRun: async () => [
        { after: 'hello', before: 'hello', filepath: 'test.txt' },
      ],
      group: 'Test',
      id: 'mock/task',
      label: 'Mock Task',
    };

    const result = await applyTasks({
      cwd: tmpDir,
      profile,
      tasks: [mockTask],
    });
    expect(result.skipped).toBe(1);
    expect(result.applied).toBe(0);

    await fs.rm(tmpDir, { recursive: true });
  });

  test('backs up existing files before applying selected tasks', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-backup-')
    );
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'test', version: '1.0.0' })
    );
    await fs.writeFile(path.join(tmpDir, 'test.txt'), 'before');

    const profile = await detectProject(tmpDir);
    const mockTask = {
      applicable: () => true,
      apply: async () => {
        await fs.writeFile(path.join(tmpDir, 'test.txt'), 'after');
      },
      check: async () => 'patch' as const,
      dryRun: async () => [
        { after: 'after', before: 'before', filepath: 'test.txt' },
      ],
      group: 'Test',
      id: 'mock/task',
      label: 'Mock Task',
    };

    const result = await applyTasks({
      cwd: tmpDir,
      profile,
      selectedIds: [mockTask.id],
      tasks: [mockTask],
    });
    expect(result.errors).toHaveLength(0);
    expect(result.applied).toBe(1);

    const backupIndex = JSON.parse(
      await fs.readFile(
        path.join(tmpDir, '.xtarterize/backups/.index.json'),
        'utf-8'
      )
    );
    expect(backupIndex['test.txt']).toHaveLength(1);
    const backupPath = backupIndex['test.txt'][0].backupPath;
    await expect(fs.readFile(backupPath, 'utf-8')).resolves.toBe('before');
    await expect(
      fs.readFile(path.join(tmpDir, 'test.txt'), 'utf-8')
    ).resolves.toBe('after');

    await fs.rm(tmpDir, { recursive: true });
  });

  test('skips conflict tasks unless includeConflicts is set', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-conflict-')
    );
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'test', version: '1.0.0' })
    );

    const profile = await detectProject(tmpDir);
    let applied = false;
    const mockTask = {
      applicable: () => true,
      apply: async () => {
        applied = true;
      },
      check: async () => 'conflict' as const,
      dryRun: async () => [
        { after: 'after', before: 'before', filepath: 'test.txt' },
      ],
      group: 'Test',
      id: 'mock/conflict',
      label: 'Mock Conflict',
    };

    const skipped = await applyTasks({
      cwd: tmpDir,
      profile,
      tasks: [mockTask],
    });
    expect(skipped.skipped).toBe(1);
    expect(skipped.applied).toBe(0);
    expect(applied).toBe(false);

    const withSelectedIds = await applyTasks({
      cwd: tmpDir,
      profile,
      selectedIds: [mockTask.id],
      tasks: [mockTask],
    });
    expect(withSelectedIds.skipped).toBe(1);
    expect(withSelectedIds.applied).toBe(0);
    expect(applied).toBe(false);

    const withIncludeConflicts = await applyTasks({
      cwd: tmpDir,
      includeConflicts: true,
      profile,
      selectedIds: [mockTask.id],
      tasks: [mockTask],
    });
    expect(withIncludeConflicts.skipped).toBe(0);
    expect(withIncludeConflicts.applied).toBe(1);
    expect(applied).toBe(true);

    await fs.rm(tmpDir, { recursive: true });
  });

  test('applies conflict tasks when includeConflicts option is true', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-include-conflicts-')
    );
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'test', version: '1.0.0' })
    );

    const profile = await detectProject(tmpDir);
    let applied = false;
    const mockTask = {
      applicable: () => true,
      apply: async () => {
        applied = true;
      },
      check: async () => 'conflict' as const,
      dryRun: async () => [
        { after: 'after', before: 'before', filepath: 'test.txt' },
      ],
      group: 'Test',
      id: 'mock/conflict',
      label: 'Mock Conflict',
    };

    const result = await applyTasks({
      cwd: tmpDir,
      includeConflicts: true,
      profile,
      tasks: [mockTask],
    });
    expect(result.applied).toBe(1);
    expect(result.skipped).toBe(0);
    expect(applied).toBe(true);

    await fs.rm(tmpDir, { recursive: true });
  });

  test('continues applying remaining tasks after one fails', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-partial-')
    );
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'test', version: '1.0.0' })
    );

    const profile = await detectProject(tmpDir);
    const failingTask = {
      applicable: () => true,
      apply: async () => {
        throw new Error('intentional failure');
      },
      check: async () => 'new' as const,
      dryRun: async () => [],
      group: 'Test',
      id: 'mock/fail',
      label: 'Failing Task',
    };
    let goodApplied = false;
    const goodTask = {
      applicable: () => true,
      apply: async () => {
        goodApplied = true;
      },
      check: async () => 'new' as const,
      dryRun: async () => [],
      group: 'Test',
      id: 'mock/good',
      label: 'Good Task',
    };

    const result = await applyTasks({
      cwd: tmpDir,
      profile,
      tasks: [failingTask, goodTask],
    });
    expect(result.applied).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('intentional failure');
    expect(goodApplied).toBe(true);

    await fs.rm(tmpDir, { recursive: true });
  });
});
