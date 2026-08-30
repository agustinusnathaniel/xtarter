import type { ProjectProfile, Task } from '@xtarterize/core';
import { resolveProjectTasks, resolveTaskStatuses } from '@xtarterize/core';
import { describe, expect } from 'vite-plus/test';

function makeTask(
  id: string,
  check: () => Promise<'new' | 'patch' | 'skip' | 'conflict'>
): Task {
  return {
    applicable: () => true,
    apply: async () => {},
    check,
    dryRun: async () => [],
    group: 'test',
    id,
    label: id,
  };
}

const profile: ProjectProfile = {
  bundler: 'none',
  detectedFiles: [],
  framework: 'node',
  monorepo: false,
  packageManager: 'npm',
  typescript: true,
  workspaceRoot: null,
};

describe('resolveTaskStatuses error isolation', () => {
  test('resolves all statuses when one check throws', async () => {
    const tasks = [
      makeTask('ok-task', async () => 'skip'),
      makeTask('boom-task', async () => {
        throw new Error('simulated check failure');
      }),
      makeTask('ok-task-2', async () => 'patch'),
    ];

    const statuses = await resolveTaskStatuses(tasks, '/tmp', profile);
    expect(statuses.get('ok-task')).toBe('skip');
    expect(statuses.get('ok-task-2')).toBe('patch');
    // A task whose check throws degrades to conflict (needs attention)
    // instead of crashing the whole resolution.
    expect(statuses.get('boom-task')).toBe('conflict');
  });

  test('resolveProjectTasks does not crash on a throwing check', async () => {
    const tasks = [
      makeTask('boom-task', async () => {
        throw new Error('simulated check failure');
      }),
      makeTask('ok-task', async () => 'skip'),
    ];

    const result = await resolveProjectTasks('/tmp', tasks);
    expect(result.tasks.length).toBe(2);
    expect(result.statuses.get('ok-task')).toBe('skip');
  });
});
