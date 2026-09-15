import fs from 'node:fs/promises';
import path from 'node:path';
import {
  fixtureDir,
  fixtureProfile,
  withProject,
} from '@test/helpers/project.js';
import { run } from '@test/helpers/run.js';
import { planTasks } from '@xtarterize/core';
import { describe, expect } from 'vite-plus/test';

import { viteCheckerTask } from '../../packages/tasks/src/vite/checker.js';
import { viteVisualizerTask } from '../../packages/tasks/src/vite/visualizer.js';

describe('viteCheckerTask', () => {
  test('is applicable to vite projects only', async () => {
    const viteProfile = await fixtureProfile('react-vite-tailwind');
    expect(viteCheckerTask.applicable(viteProfile)).toBe(true);

    const nextProfile = await fixtureProfile('nextjs');
    expect(viteCheckerTask.applicable(nextProfile)).toBe(false);
  });

  test('returns patch when plugin is missing from an existing config', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    const status = await run(
      viteCheckerTask.check(fixtureDir('react-vite-tailwind'), profile)
    );
    expect(status).toBe('patch');
  });

  test('returns skip when the plugin is already imported', async () => {
    await withProject(
      {
        'package.json': {
          devDependencies: {
            vite: '^5.0.0',
            'vite-plugin-checker': '*',
          },
          name: 'checker-present',
        },
        'vite.config.ts': `import checker from 'vite-plugin-checker'\nexport default { plugins: [checker()] }\n`,
      },
      async ({ cwd, profile }) => {
        await expect(run(viteCheckerTask.check(cwd, profile))).resolves.toBe(
          'skip'
        );
      }
    );
  });

  test('dryRun returns the real vite.config.ts diff', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    const cwd = fixtureDir('react-vite-tailwind');
    const diffs = await run(viteCheckerTask.dryRun(cwd, profile));
    expect(diffs.length).toBe(1);
    expect(diffs[0].filepath).toBe('vite.config.ts');

    const plan = await run(
      planTasks({ cwd, profile, tasks: [viteCheckerTask] })
    );
    expect(plan.files).toEqual(['vite.config.ts']);
  });

  test('apply writes the expected file', async () => {
    await withProject(
      {
        'package.json': {
          devDependencies: {
            vite: '^5.0.0',
            'vite-plugin-checker': '*',
          },
          name: 'apply-test',
        },
        'vite.config.ts': `import { defineConfig } from 'vite'\nexport default defineConfig({})`,
      },
      async ({ cwd, profile }) => {
        await run(viteCheckerTask.apply(cwd, profile));
        const content = await fs.readFile(
          path.join(cwd, 'vite.config.ts'),
          'utf-8'
        );
        expect(content).toContain('vite-plugin-checker');
      }
    );
  });
});

describe('viteVisualizerTask', () => {
  test('is applicable to vite projects only', async () => {
    const viteProfile = await fixtureProfile('react-vite-tailwind');
    expect(viteVisualizerTask.applicable(viteProfile)).toBe(true);
  });

  test('returns patch when plugin is missing from an existing config', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    const status = await run(
      viteVisualizerTask.check(fixtureDir('react-vite-tailwind'), profile)
    );
    expect(status).toBe('patch');
  });
});
