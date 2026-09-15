import { makeProfile, makeTask } from '@test/helpers/factories.js';
import { run } from '@test/helpers/run.js';
import type { TaskStatus } from '@xtarterize/core';
import { resolveProjectTasks, resolveTaskStatuses } from '@xtarterize/core';
import { Effect } from 'effect';
import { describe, expect } from 'vite-plus/test';

const checkedTask = (
  id: string,
  check: () => Effect.Effect<TaskStatus>
): ReturnType<typeof makeTask> =>
  makeTask({ check, group: 'test', id, label: id });

const profile = makeProfile({
  bundler: 'none',
  packageManager: 'npm',
  typescript: true,
});

describe('resolveTaskStatuses error isolation', () => {
  test('resolves all statuses when one check throws', async () => {
    const tasks = [
      checkedTask('ok-task', () => Effect.succeed('skip')),
      checkedTask('boom-task', () =>
        Effect.die(new Error('simulated check failure'))
      ),
      checkedTask('ok-task-2', () => Effect.succeed('patch')),
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
      checkedTask('boom-task', () =>
        Effect.die(new Error('simulated check failure'))
      ),
      checkedTask('ok-task', () => Effect.succeed('skip')),
    ];

    const result = await run(resolveProjectTasks('/tmp', tasks));
    expect(result.tasks.length).toBe(2);
    expect(result.statuses.get('ok-task')).toBe('skip');
  });
});
