import fs from 'node:fs/promises';
import path from 'node:path';
import { makeTask } from '@test/helpers/factories.js';
import { withProject } from '@test/helpers/project.js';
import { runWith } from '@test/helpers/run.js';
import type {
  ApplyPlan,
  ApplyResult,
  ProjectProfile,
  Task,
  TaskDep,
} from '@xtarterize/core';
import {
  DepsInstallError,
  DepsInstaller,
  executePlan,
  ProcessRunner,
  planTasks,
} from '@xtarterize/core';
import { Effect, Layer } from 'effect';
import { describe, expect, vi } from 'vite-plus/test';

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

const projectFiles = { 'package.json': { name: 'test', version: '1.0.0' } };

describe('planTasks', () => {
  test('plans diffs without writing, backing up, or installing', async () => {
    await withProject(projectFiles, async ({ cwd: tmpDir, profile }) => {
      const mockTask = makeTask({
        apply: () =>
          Effect.promise(() =>
            fs.writeFile(path.join(tmpDir, 'test.txt'), 'hello')
          ),
        dryRun: () =>
          Effect.succeed([
            { after: 'hello', before: null, filepath: 'test.txt' },
          ]),
        getDeps: () => Effect.succeed([{ depName: 'plan-dep', dev: true }]),
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
    await withProject(projectFiles, async ({ cwd: tmpDir, profile }) => {
      const mockTask = makeTask({
        check: 'skip',
        dryRun: () =>
          Effect.succeed([
            { after: 'ignored', before: null, filepath: 'ignored.txt' },
          ]),
        getDeps: () => Effect.succeed([{ depName: 'skipped-dep', dev: true }]),
        id: 'mock/plan-skip',
        label: 'Mock Plan Skip',
      });

      const plan = await runPlan(tmpDir, profile, [mockTask]);

      expect(plan.entries[0]?.skipped).toBe(true);
      expect(plan.entries[0]?.diffs).toEqual([]);
      expect(plan.files).toEqual([]);
      expect(plan.dependencies).toEqual([]);

      const result = await runExecute(tmpDir, plan, profile);
      expect(result.skipped).toBe(1);
      expect(result.applied).toBe(0);
    });
  });
});

describe('planTasks', () => {
  test('skips conflict tasks unless includeConflicts is set', async () => {
    await withProject(projectFiles, async ({ cwd: tmpDir, profile }) => {
      let applied = false;
      const conflictTask = makeTask({
        apply: () =>
          Effect.sync(() => {
            applied = true;
          }),
        check: 'conflict',
        dryRun: () =>
          Effect.succeed([
            { after: 'after', before: 'before', filepath: 'test.txt' },
          ]),
        id: 'mock/conflict',
        label: 'Mock Conflict',
      });

      const skippedPlan = await runPlan(tmpDir, profile, [conflictTask]);
      const skipped = await runExecute(tmpDir, skippedPlan, profile);
      expect(skipped.skipped).toBe(1);
      expect(skipped.applied).toBe(0);
      expect(applied).toBe(false);

      const includedPlan = await runWith(
        TestApplyLayer,
        planTasks({
          cwd: tmpDir,
          includeConflicts: true,
          profile,
          tasks: [conflictTask],
        })
      );
      const included = await runExecute(tmpDir, includedPlan, profile);
      expect(included.skipped).toBe(0);
      expect(included.applied).toBe(1);
      expect(applied).toBe(true);
    });
  });
});

describe('executePlan', () => {
  test('backs up and manifests exactly the plan files', async () => {
    await withProject(projectFiles, async ({ cwd: tmpDir, profile }) => {
      await fs.writeFile(path.join(tmpDir, 'test.txt'), 'before');

      const mockTask = makeTask({
        apply: () =>
          Effect.promise(() =>
            fs.writeFile(path.join(tmpDir, 'test.txt'), 'after')
          ),
        check: 'patch',
        dryRun: () =>
          Effect.succeed([
            { after: 'after', before: 'before', filepath: 'test.txt' },
          ]),
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
});

describe('executePlan', () => {
  test('reports per-entry apply errors and continues with remaining entries', async () => {
    await withProject(projectFiles, async ({ cwd: tmpDir, profile }) => {
      const failingTask = makeTask({
        apply: () => Effect.die(new Error('entry failure')),
        id: 'mock/plan-fail',
        label: 'Plan Fail',
      });
      let goodApplied = false;
      const goodTask = makeTask({
        apply: () =>
          Effect.sync(() => {
            goodApplied = true;
          }),
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
});

describe('executePlan', () => {
  test('reports per-entry dry-run errors and excludes the entry from the plan', async () => {
    await withProject(projectFiles, async ({ cwd: tmpDir, profile }) => {
      const failingTask = makeTask({
        dryRun: () => Effect.die(new Error('dryRun boom')),
        getDeps: () => Effect.succeed([{ depName: 'failed-dep', dev: true }]),
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
    await withProject(projectFiles, async ({ cwd: tmpDir, profile }) => {
      let applied = false;
      const mockTask = makeTask({
        apply: () =>
          Effect.sync(() => {
            applied = true;
          }),
        getDeps: () => Effect.succeed([{ depName: 'broken-dep', dev: true }]),
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
