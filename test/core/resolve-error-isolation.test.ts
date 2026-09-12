import type { ProjectProfile, Task, TaskStatus } from '@xtarterize/core';
import { resolveProjectTasks, resolveTaskStatuses } from '@xtarterize/core';
import { Effect } from 'effect';
import { describe, expect } from 'vite-plus/test';

import { run } from '../helpers/run.js';

function makeTask(id: string, check: () => Effect.Effect<TaskStatus>): Task {
  return {
    applicable: () => true,
    apply: () => Effect.void,
    check,
    dryRun: () => Effect.succeed([]),
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
      makeTask('ok-task', () => Effect.succeed('skip')),
      makeTask('boom-task', () =>
        Effect.die(new Error('simulated check failure'))
      ),
      makeTask('ok-task-2', () => Effect.succeed('patch')),
    ];

    const statuses = await run(resolveTaskStatuses(tasks, '/tmp', profile));
    expect(statuses.get('ok-task')).toBe('skip');
    expect(statuses.get('ok-task-2')).toBe('patch');
    // A task whose check throws degrades to conflict (needs attention)
    // instead of crashing the whole resolution.
    expect(statuses.get('boom-task')).toBe('conflict');
  });

  test('resolveProjectTasks does not crash on a throwing check', async () => {
    const tasks = [
      makeTask('boom-task', () =>
        Effect.die(new Error('simulated check failure'))
      ),
      makeTask('ok-task', () => Effect.succeed('skip')),
    ];

    const result = await run(resolveProjectTasks('/tmp', tasks));
    expect(result.tasks.length).toBe(2);
    expect(result.statuses.get('ok-task')).toBe('skip');
  });
});
