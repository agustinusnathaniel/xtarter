import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  ApplyPlan,
  ApplyResult,
  ProjectProfile,
  PromiseTask,
  Task,
  TaskDep,
  TaskStatus,
} from '@xtarterize/core';
import {
  DepsInstallError,
  DepsInstaller,
  detectProject,
  executePlan,
  ProcessRunner,
  planTasks,
} from '@xtarterize/core';
import { Effect, Layer } from 'effect';
import { describe, expect, vi } from 'vite-plus/test';

import { runWith } from '../helpers/run.js';
import { withTempDir } from '../helpers/temp.js';

const mockInstall = vi.fn<
  (
    cwd: string,
    deps: ReadonlyArray<TaskDep>,
    options?: { silent?: boolean }
  ) => Effect.Effect<void, DepsInstallError>
>(() => Effect.void);

/** Real task services plus a scriptable installer stub. */
const TestApplyLayer = Layer.mergeAll(
  ProcessRunner.layer,
  Layer.succeed(DepsInstaller, { install: mockInstall })
);

interface MockTaskOptions {
  apply?: PromiseTask['apply'];
  check?: TaskStatus;
  dryRun?: PromiseTask['dryRun'];
  getDeps?: PromiseTask['getDeps'];
  id?: string;
  label?: string;
}

/** Build a promise task whose identity and hooks default to a no-op. */
function makeTask(options: MockTaskOptions = {}): PromiseTask {
  const task: PromiseTask = {
    applicable: () => true,
    apply: options.apply ?? (async () => {}),
    check: async () => options.check ?? 'new',
    dryRun: options.dryRun ?? (async () => []),
    group: 'Test',
    id: options.id ?? 'mock/task',
    label: options.label ?? 'Mock Task',
  };
  if (options.getDeps) {
    task.getDeps = options.getDeps;
  }
  return task;
}

function runPlan(
  cwd: string,
  profile: ProjectProfile,
  tasks: Array<Task>
): Promise<ApplyPlan> {
  return runWith(TestApplyLayer, planTasks({ cwd, profile, tasks }));
}

function runExecute(
  cwd: string,
  plan: ApplyPlan,
  profile: ProjectProfile
): Promise<ApplyResult> {
  return runWith(TestApplyLayer, executePlan({ cwd, plan, profile }));
}

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
  const plan = await runWith(
    TestApplyLayer,
    planTasks({
      cwd: options.cwd,
      includeConflicts: options.includeConflicts ?? false,
      profile: options.profile,
      quiet,
      statuses: options.statuses,
      tasks,
    })
  );
  return runWith(
    TestApplyLayer,
    executePlan({
      cwd: options.cwd,
      plan,
      profile: options.profile,
      quiet,
    })
  );
}

/** Run `fn` against a temp project containing only a package.json. */
function withProject<Result>(
  prefix: string,
  fn: (dir: string) => Promise<Result>
): Promise<Result> {
  return withTempDir(prefix, async (dir) => {
    await fs.writeFile(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 'test', version: '1.0.0' })
    );
    return fn(dir);
  });
}

describe('applyTasks', () => {
  test('applies a single task successfully', async () => {
    await withProject('xtarterize-apply-', async (tmpDir) => {
      const profile = await detectProject(tmpDir);
      const mockTask = makeTask({
        apply: async () => {
          await fs.writeFile(path.join(tmpDir, 'test.txt'), 'hello');
        },
        dryRun: async () => [
          { after: 'hello', before: null, filepath: 'test.txt' },
        ],
      });

      const result = await applyTasks({
        cwd: tmpDir,
        profile,
        tasks: [mockTask],
      });
      expect(result.errors).toHaveLength(0);
      expect(result.applied).toBe(1);
    });
  });

  test('skips tasks that are already applied', async () => {
    await withProject('xtarterize-skip-', async (tmpDir) => {
      await fs.writeFile(path.join(tmpDir, 'test.txt'), 'hello');

      const profile = await detectProject(tmpDir);
      const mockTask = makeTask({
        check: 'skip',
        dryRun: async () => [
          { after: 'hello', before: 'hello', filepath: 'test.txt' },
        ],
      });

      const result = await applyTasks({
        cwd: tmpDir,
        profile,
        tasks: [mockTask],
      });
      expect(result.skipped).toBe(1);
      expect(result.applied).toBe(0);
    });
  });

  test('backs up existing files before applying selected tasks', async () => {
    await withProject('xtarterize-backup-', async (tmpDir) => {
      await fs.writeFile(path.join(tmpDir, 'test.txt'), 'before');

      const profile = await detectProject(tmpDir);
      const mockTask = makeTask({
        apply: async () => {
          await fs.writeFile(path.join(tmpDir, 'test.txt'), 'after');
        },
        check: 'patch',
        dryRun: async () => [
          { after: 'after', before: 'before', filepath: 'test.txt' },
        ],
      });

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
    });
  });

  test('skips conflict tasks unless includeConflicts is set', async () => {
    await withProject('xtarterize-conflict-', async (tmpDir) => {
      const profile = await detectProject(tmpDir);
      let applied = false;
      const mockTask = makeTask({
        apply: async () => {
          applied = true;
        },
        check: 'conflict',
        dryRun: async () => [
          { after: 'after', before: 'before', filepath: 'test.txt' },
        ],
        id: 'mock/conflict',
        label: 'Mock Conflict',
      });

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
    });
  });

  test('continues applying remaining tasks after one fails', async () => {
    await withProject('xtarterize-partial-', async (tmpDir) => {
      const profile = await detectProject(tmpDir);
      const failingTask = makeTask({
        apply: async () => {
          throw new Error('intentional failure');
        },
        id: 'mock/fail',
        label: 'Failing Task',
      });
      let goodApplied = false;
      const goodTask = makeTask({
        apply: async () => {
          goodApplied = true;
        },
        id: 'mock/good',
        label: 'Good Task',
      });

      const result = await applyTasks({
        cwd: tmpDir,
        profile,
        tasks: [failingTask, goodTask],
      });
      expect(result.applied).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('intentional failure');
      expect(goodApplied).toBe(true);
    });
  });
});

describe('planTasks', () => {
  test('plans diffs without writing, backing up, or installing', async () => {
    await withProject('xtarterize-plan-', async (tmpDir) => {
      const profile = await detectProject(tmpDir);
      const mockTask = makeTask({
        apply: async () => {
          await fs.writeFile(path.join(tmpDir, 'test.txt'), 'hello');
        },
        dryRun: async () => [
          { after: 'hello', before: null, filepath: 'test.txt' },
        ],
        getDeps: async () => [{ depName: 'plan-dep', dev: true }],
        id: 'mock/plan',
        label: 'Mock Plan',
      });

      mockInstall.mockClear();
      const plan = await runPlan(tmpDir, profile, [mockTask]);

      expect(plan.entries).toHaveLength(1);
      expect(plan.entries[0]?.skipped).toBe(false);
      expect(plan.entries[0]?.status).toBe('new');
      expect(plan.entries[0]?.diffs).toEqual([
        { after: 'hello', before: null, filepath: 'test.txt' },
      ]);
      expect(plan.files).toEqual(['test.txt']);
      expect(plan.dependencies).toEqual([{ depName: 'plan-dep', dev: true }]);

      // The task plan must not write its target file, create backups, or
      // install dependencies.
      await expect(fs.access(path.join(tmpDir, 'test.txt'))).rejects.toThrow();
      await expect(
        fs.access(path.join(tmpDir, '.xtarterize', 'backups'))
      ).rejects.toThrow();
      expect(mockInstall).not.toHaveBeenCalled();
    });
  });

  test('keeps skipped tasks in the plan without diffs or dependency installs', async () => {
    await withProject('xtarterize-plan-skip-', async (tmpDir) => {
      const profile = await detectProject(tmpDir);
      const mockTask = makeTask({
        check: 'skip',
        dryRun: async () => [
          { after: 'ignored', before: null, filepath: 'ignored.txt' },
        ],
        getDeps: async () => [{ depName: 'skipped-dep', dev: true }],
        id: 'mock/plan-skip',
        label: 'Mock Plan Skip',
      });

      const plan = await runPlan(tmpDir, profile, [mockTask]);

      expect(plan.entries[0]?.skipped).toBe(true);
      expect(plan.entries[0]?.diffs).toEqual([]);
      expect(plan.files).toEqual([]);
      expect(plan.dependencies).toEqual([]);
    });
  });
});

describe('executePlan', () => {
  test('backs up and manifests exactly the plan files', async () => {
    await withProject('xtarterize-exec-plan-', async (tmpDir) => {
      await fs.writeFile(path.join(tmpDir, 'test.txt'), 'before');

      const profile = await detectProject(tmpDir);
      const mockTask = makeTask({
        apply: async () => {
          await fs.writeFile(path.join(tmpDir, 'test.txt'), 'after');
        },
        check: 'patch',
        dryRun: async () => [
          { after: 'after', before: 'before', filepath: 'test.txt' },
        ],
        id: 'mock/plan-exec',
        label: 'Mock Plan Exec',
      });

      const plan = await runPlan(tmpDir, profile, [mockTask]);
      expect(plan.files).toEqual(['test.txt']);

      const result = await runExecute(tmpDir, plan, profile);
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
    });
  });

  test('reports per-entry apply errors and continues with remaining entries', async () => {
    await withProject('xtarterize-exec-errors-', async (tmpDir) => {
      const profile = await detectProject(tmpDir);
      const failingTask = makeTask({
        apply: async () => {
          throw new Error('entry failure');
        },
        id: 'mock/plan-fail',
        label: 'Plan Fail',
      });
      let goodApplied = false;
      const goodTask = makeTask({
        apply: async () => {
          goodApplied = true;
        },
        id: 'mock/plan-good',
        label: 'Plan Good',
      });

      const plan = await runPlan(tmpDir, profile, [failingTask, goodTask]);
      const result = await runExecute(tmpDir, plan, profile);

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
    });
  });

  test('reports per-entry dry-run errors and excludes the entry from the plan', async () => {
    await withProject('xtarterize-dryrun-', async (tmpDir) => {
      const profile = await detectProject(tmpDir);
      const failingTask = makeTask({
        dryRun: async () => {
          throw new Error('dryRun boom');
        },
        getDeps: async () => [{ depName: 'failed-dep', dev: true }],
        id: 'mock/plan-dryrun-fail',
        label: 'Plan Dry Run Fail',
      });

      const plan = await runPlan(tmpDir, profile, [failingTask]);

      expect(plan.entries[0]?.dryRunError).toContain('dryRun boom');
      expect(plan.files).toEqual([]);
      expect(plan.dependencies).toEqual([]);

      const result = await runExecute(tmpDir, plan, profile);
      expect(result.errors).toContain('mock/plan-dryrun-fail: dryRun boom');
    });
  });

  test('surfaces batch install failure in ApplyResult.errors', async () => {
    await withProject('xtarterize-install-fail-', async (tmpDir) => {
      const profile = await detectProject(tmpDir);
      let applied = false;
      const mockTask = makeTask({
        apply: async () => {
          applied = true;
        },
        getDeps: async () => [{ depName: 'broken-dep', dev: true }],
        id: 'mock/install-fail',
        label: 'Mock Install Fail',
      });

      const plan = await runPlan(tmpDir, profile, [mockTask]);
      mockInstall.mockReturnValueOnce(
        Effect.fail(new DepsInstallError({ message: 'install exploded' }))
      );

      const result = await runExecute(tmpDir, plan, profile);

      expect(
        result.errors.some(
          (error) =>
            error.includes('Failed to batch-install dependencies') &&
            error.includes('install exploded')
        )
      ).toBe(true);
      // The install failure must not stop the task from applying.
      expect(applied).toBe(true);
    });
  });
});
