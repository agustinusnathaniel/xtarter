import { getAllTasks } from '@xtarterize/tasks';
import { describe, expect } from 'vite-plus/test';

import { incrementalTask } from '../../packages/tasks/src/ts/incremental.js';
import { fixtureDir, fixtureProfile } from '../helpers/project.js';
import { run } from '../helpers/run.js';

describe('incrementalTask', () => {
  test('is applicable to TS projects only', async () => {
    const tsProfile = await fixtureProfile('react-vite-tailwind');
    expect(incrementalTask.applicable(tsProfile)).toBe(true);
  });

  test('returns patch when incremental is missing', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    const status = await run(
      incrementalTask.check(fixtureDir('react-vite-tailwind'), profile)
    );
    expect(status).toBe('patch');
  });

  test('dryRun returns correct diff', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    const diffs = await run(
      incrementalTask.dryRun(fixtureDir('react-vite-tailwind'), profile)
    );
    expect(diffs.length).toBe(1);
    expect(diffs[0].after).toContain('incremental');
  });
});

describe('TypeScript task coverage', () => {
  test('registers PRD TypeScript tasks without Ultracite', () => {
    const taskIds = getAllTasks().map((task) => task.id);

    expect(taskIds).toContain('ts/strict');
    expect(taskIds).toContain('ts/paths');
    expect(taskIds).toContain('ts/incremental');
    expect(taskIds).toContain('gitignore/tsbuildinfo');
    expect(taskIds).not.toContain('lint/ultracite');
  });
});
