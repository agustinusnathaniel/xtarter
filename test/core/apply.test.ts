import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { ProjectProfile, Task, TaskStatus } from '@xtarterize/core';
import { detectProject, executePlan, planTasks } from '@xtarterize/core';
import { describe, expect, vi } from 'vite-plus/test';

const { mockInstallDependenciesBatch } = vi.hoisted(() => ({
  mockInstallDependenciesBatch: vi.fn(),
}));

// Path-based mock so executePlan's internal `@/utils/pkg.js` import is
// intercepted. The path is root-relative, matching how Vite resolves the
// module inside packages/core; a bare specifier would not match.
vi.mock('/packages/core/src/utils/pkg.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    installDependenciesBatch: mockInstallDependenciesBatch,
  };
});

/** Apply a selected task set the way the removed `applyTasks` helper did. */
async function applyTasks(options: {
  cwd: string;
  includeConflicts?: boolean;
  profile: ProjectProfile;
  quiet?: boolean;
  selectedIds?: Array<string>;
  statuses?: ReadonlyMap<string, TaskStatus>;
  tasks: Array<Task>;
}) {
  const { selectedIds } = options;
  const tasks = selectedIds
    ? options.tasks.filter((t) => selectedIds.includes(t.id))
    : options.tasks;
  const quiet = options.quiet ?? false;
  const plan = await planTasks({
    cwd: options.cwd,
    includeConflicts: options.includeConflicts ?? false,
    profile: options.profile,
    quiet,
    statuses: options.statuses,
    tasks,
  });
  return executePlan({
    cwd: options.cwd,
    plan,
    profile: options.profile,
    quiet,
  });
}

/** Create a temp project with a package.json and the given dir prefix. */
async function setupProject(prefix: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.writeFile(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'test', version: '1.0.0' })
  );
  return dir;
}

describe('applyTasks', () => {
  test('applies a single task successfully', async () => {
    const tmpDir = await setupProject('xtarterize-apply-');

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
    const tmpDir = await setupProject('xtarterize-skip-');
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
    const tmpDir = await setupProject('xtarterize-backup-');
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
    const tmpDir = await setupProject('xtarterize-conflict-');

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

  test('continues applying remaining tasks after one fails', async () => {
    const tmpDir = await setupProject('xtarterize-partial-');

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

describe('planTasks', () => {
  test('plans diffs without writing, backing up, or installing', async () => {
    const tmpDir = await setupProject('xtarterize-plan-');
    try {
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
        getDeps: async () => [{ depName: 'plan-dep', dev: true }],
        group: 'Test',
        id: 'mock/plan',
        label: 'Mock Plan',
      };

      mockInstallDependenciesBatch.mockClear();
      const plan = await planTasks({
        cwd: tmpDir,
        profile,
        tasks: [mockTask],
      });

      expect(plan.entries).toHaveLength(1);
      expect(plan.entries[0]?.skipped).toBe(false);
      expect(plan.entries[0]?.status).toBe('new');
      expect(plan.entries[0]?.diffs).toEqual([
        { after: 'hello', before: null, filepath: 'test.txt' },
      ]);
      expect(plan.files).toEqual(['test.txt']);
      expect(plan.dependencies).toEqual([{ depName: 'plan-dep', dev: true }]);

      // The task plan must not write its target file, create backups, or
      // install dependencies. (`detectProject` may create the profile cache
      // under .xtarterize/cache, so only the backups directory is checked.)
      await expect(fs.access(path.join(tmpDir, 'test.txt'))).rejects.toThrow();
      await expect(
        fs.access(path.join(tmpDir, '.xtarterize', 'backups'))
      ).rejects.toThrow();
      expect(mockInstallDependenciesBatch).not.toHaveBeenCalled();
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('keeps skipped tasks in the plan without diffs or dependency installs', async () => {
    const tmpDir = await setupProject('xtarterize-plan-skip-');
    try {
      const profile = await detectProject(tmpDir);
      const mockTask = {
        applicable: () => true,
        apply: async () => {},
        check: async () => 'skip' as const,
        dryRun: async () => [
          { after: 'ignored', before: null, filepath: 'ignored.txt' },
        ],
        getDeps: async () => [{ depName: 'skipped-dep', dev: true }],
        group: 'Test',
        id: 'mock/plan-skip',
        label: 'Mock Plan Skip',
      };

      const plan = await planTasks({
        cwd: tmpDir,
        profile,
        tasks: [mockTask],
      });

      expect(plan.entries[0]?.skipped).toBe(true);
      expect(plan.entries[0]?.diffs).toEqual([]);
      expect(plan.files).toEqual([]);
      expect(plan.dependencies).toEqual([]);
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });
});

describe('executePlan', () => {
  test('backs up and manifests exactly the plan files', async () => {
    const tmpDir = await setupProject('xtarterize-exec-plan-');
    try {
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
        id: 'mock/plan-exec',
        label: 'Mock Plan Exec',
      };

      const plan = await planTasks({
        cwd: tmpDir,
        profile,
        tasks: [mockTask],
      });
      expect(plan.files).toEqual(['test.txt']);

      const result = await executePlan({ cwd: tmpDir, plan, profile });
      expect(result.errors).toHaveLength(0);
      expect(result.applied).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.timing?.tasks).toHaveLength(1);

      const manifest = JSON.parse(
        await fs.readFile(
          path.join(tmpDir, '.xtarterize/backups/last-run.json'),
          'utf-8'
        )
      );
      expect(manifest.files).toEqual(plan.files);

      const backupIndex = JSON.parse(
        await fs.readFile(
          path.join(tmpDir, '.xtarterize/backups/.index.json'),
          'utf-8'
        )
      );
      expect(backupIndex['test.txt']).toHaveLength(1);
      await expect(
        fs.readFile(path.join(tmpDir, 'test.txt'), 'utf-8')
      ).resolves.toBe('after');
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('reports per-entry apply errors and continues with remaining entries', async () => {
    const tmpDir = await setupProject('xtarterize-exec-errors-');
    try {
      const profile = await detectProject(tmpDir);
      const failingTask = {
        applicable: () => true,
        apply: async () => {
          throw new Error('entry failure');
        },
        check: async () => 'new' as const,
        dryRun: async () => [],
        group: 'Test',
        id: 'mock/plan-fail',
        label: 'Plan Fail',
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
        id: 'mock/plan-good',
        label: 'Plan Good',
      };

      const plan = await planTasks({
        cwd: tmpDir,
        profile,
        tasks: [failingTask, goodTask],
      });
      const result = await executePlan({ cwd: tmpDir, plan, profile });

      expect(result.applied).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('mock/plan-fail');
      expect(result.errors[0]).toContain('entry failure');
      expect(goodApplied).toBe(true);

      const failedEntry = plan.entries.find(
        (entry) => entry.task.id === 'mock/plan-fail'
      );
      const goodEntry = plan.entries.find(
        (entry) => entry.task.id === 'mock/plan-good'
      );
      expect(failedEntry?.applyError).toContain('entry failure');
      expect(goodEntry?.applyError).toBeUndefined();
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('reports per-entry dry-run errors and excludes the entry from the plan', async () => {
    const tmpDir = await setupProject('xtarterize-dryrun-');
    try {
      const profile = await detectProject(tmpDir);
      const failingTask = {
        applicable: () => true,
        apply: async () => {},
        check: async () => 'new' as const,
        dryRun: async () => {
          throw new Error('dryRun boom');
        },
        getDeps: async () => [{ depName: 'failed-dep', dev: true }],
        group: 'Test',
        id: 'mock/plan-dryrun-fail',
        label: 'Plan Dry Run Fail',
      };

      const plan = await planTasks({
        cwd: tmpDir,
        profile,
        tasks: [failingTask],
      });

      expect(plan.entries[0]?.dryRunError).toContain('dryRun boom');
      expect(plan.files).toEqual([]);
      expect(plan.dependencies).toEqual([]);

      const result = await executePlan({ cwd: tmpDir, plan, profile });
      expect(result.errors).toContain('mock/plan-dryrun-fail: dryRun boom');
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('surfaces batch install failure in ApplyResult.errors', async () => {
    const tmpDir = await setupProject('xtarterize-install-fail-');
    try {
      const profile = await detectProject(tmpDir);
      let applied = false;
      const mockTask = {
        applicable: () => true,
        apply: async () => {
          applied = true;
        },
        check: async () => 'new' as const,
        dryRun: async () => [],
        getDeps: async () => [{ depName: 'broken-dep', dev: true }],
        group: 'Test',
        id: 'mock/install-fail',
        label: 'Mock Install Fail',
      };

      const plan = await planTasks({
        cwd: tmpDir,
        profile,
        tasks: [mockTask],
      });
      mockInstallDependenciesBatch.mockRejectedValueOnce(
        new Error('install exploded')
      );

      const result = await executePlan({ cwd: tmpDir, plan, profile });

      expect(
        result.errors.some(
          (error) =>
            error.includes('Failed to batch-install dependencies') &&
            error.includes('install exploded')
        )
      ).toBe(true);
      // The install failure must not stop the task from applying.
      expect(applied).toBe(true);
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });
});
