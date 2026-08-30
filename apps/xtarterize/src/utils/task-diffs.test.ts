import type { ProjectProfile, Task } from '@xtarterize/core';
import { afterEach, beforeEach, describe, expect, test } from 'vite-plus/test';

import { collectTaskDiffs } from '@/utils/task-diffs.js';

const profileStub = {} as never;

function createTask(id: string, dryRun: Task['dryRun']): Task {
  return {
    applicable: () => true,
    apply: async () => {},
    check: async () => 'new',
    dryRun,
    group: 'test',
    id,
    label: id,
  };
}

describe('collectTaskDiffs', () => {
  beforeEach(() => {
    process.exitCode = 0;
  });

  afterEach(() => {
    process.exitCode = 0;
  });

  test('collects diffs from successful tasks and counts failures', async () => {
    const goodTask = createTask('good', async () => [
      { after: 'x', before: null, filepath: 'a.txt' },
    ]);
    const badTask = createTask('bad', async () => {
      throw new Error('boom');
    });

    const result = await collectTaskDiffs(
      [goodTask, badTask],
      '/tmp',
      profileStub as ProjectProfile
    );

    expect(result.diffs.length).toBe(1);
    expect(result.failures).toBe(1);
    expect(result.diffs[0]).toEqual({
      after: 'x',
      before: null,
      filepath: 'a.txt',
    });
  });
});
