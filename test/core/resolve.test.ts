import type { Task } from '@xtarterize/core';
import { resolveTaskStatuses, resolveTasks } from '@xtarterize/core';
import { getAllTasks } from '@xtarterize/tasks';
import { describe, expect } from 'vite-plus/test';

import { makeProfile, makeTask } from '../helpers/factories.js';
import { fixtureDir, fixtureProfile } from '../helpers/project.js';
import { run } from '../helpers/run.js';

describe('resolveTasks', () => {
  test('filters tasks by applicability', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    const allTasks = getAllTasks();
    const tasks = resolveTasks(profile, allTasks);
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks.length).toBeLessThan(allTasks.length);

    // Vite tasks should be present for vite bundler
    const viteTasks = tasks.filter((t) => t.group === 'Vite Plugins');
    expect(viteTasks.length).toBeGreaterThan(0);
  });

  test('excludes vite tasks for non-vite projects', async () => {
    const profile = await fixtureProfile('nextjs');
    const allTasks = getAllTasks();
    const tasks = resolveTasks(profile, allTasks);
    const viteTasks = tasks.filter((t) => t.group === 'Vite Plugins');
    expect(viteTasks).toHaveLength(0);
  });
});

describe('resolveTaskStatuses', () => {
  test('resolves statuses for all tasks', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    const allTasks = getAllTasks();
    const tasks = resolveTasks(profile, allTasks);
    const statuses = await run(
      resolveTaskStatuses(tasks, fixtureDir('react-vite-tailwind'), profile)
    );

    for (const task of tasks) {
      expect(statuses.has(task.id)).toBe(true);
      const status = statuses.get(task.id);
      expect(['new', 'patch', 'skip', 'conflict']).toContain(status);
    }
  });
});

describe('resolveTasks - scope filtering', () => {
  const rootTask = makeTask({
    check: 'skip',
    group: 'test',
    id: 'test/root',
    label: 'test/root',
    scope: 'root',
  });
  const packageTask = makeTask({
    check: 'skip',
    group: 'test',
    id: 'test/package',
    label: 'test/package',
    scope: 'package',
  });
  const bothTask = makeTask({
    check: 'skip',
    group: 'test',
    id: 'test/both',
    label: 'test/both',
    scope: 'both',
  });
  const noScopeTask = makeTask({
    check: 'skip',
    group: 'test',
    id: 'test/noscope',
    label: 'test/noscope',
  });

  test('includes all tasks regardless of scope in non-monorepo', () => {
    const profile = makeProfile({ monorepo: false });
    const tasks = resolveTasks(profile, [
      rootTask,
      packageTask,
      bothTask,
      noScopeTask,
    ]);
    expect(tasks).toHaveLength(4);
    expect(tasks.map((t) => t.id)).toEqual([
      'test/root',
      'test/package',
      'test/both',
      'test/noscope',
    ]);
  });

  test('excludes package-scoped tasks at monorepo root', () => {
    const profile = makeProfile({ monorepo: true, workspaceRoot: true });
    const tasks = resolveTasks(profile, [
      rootTask,
      packageTask,
      bothTask,
      noScopeTask,
    ]);
    expect(tasks).toHaveLength(3);
    expect(tasks.map((t) => t.id)).toEqual([
      'test/root',
      'test/both',
      'test/noscope',
    ]);
  });

  test('excludes root-scoped tasks inside workspace package', () => {
    const profile = makeProfile({ monorepo: true, workspaceRoot: false });
    const tasks = resolveTasks(profile, [
      rootTask,
      packageTask,
      bothTask,
      noScopeTask,
    ]);
    expect(tasks).toHaveLength(3);
    expect(tasks.map((t) => t.id)).toEqual([
      'test/package',
      'test/both',
      'test/noscope',
    ]);
  });

  test('applies applicable() filter before scope filter', () => {
    const nonApplicableTask: Task = {
      ...packageTask,
      applicable: () => false,
    };
    const profile = makeProfile({ monorepo: true, workspaceRoot: false });
    const tasks = resolveTasks(profile, [rootTask, nonApplicableTask]);
    // nonApplicableTask excluded by applicable(), rootTask excluded by scope
    expect(tasks).toHaveLength(0);
  });

  test('tasks without explicit scope are included everywhere', () => {
    const rootProfile = makeProfile({ monorepo: true, workspaceRoot: true });
    const packageProfile = makeProfile({
      monorepo: true,
      workspaceRoot: false,
    });

    const rootTasks = resolveTasks(rootProfile, [noScopeTask]);
    expect(rootTasks).toHaveLength(1);
    expect(rootTasks[0].id).toBe('test/noscope');

    const packageTasks = resolveTasks(packageProfile, [noScopeTask]);
    expect(packageTasks).toHaveLength(1);
    expect(packageTasks[0].id).toBe('test/noscope');
  });
});
