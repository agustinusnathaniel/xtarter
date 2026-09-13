import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { detectProject, planTasks } from '@xtarterize/core';
import { describe, expect } from 'vite-plus/test';

import { viteCheckerTask } from '../../packages/tasks/src/vite/checker.js';
import { viteVisualizerTask } from '../../packages/tasks/src/vite/visualizer.js';
import { fixtureDir, fixtureProfile } from '../helpers/project.js';
import { run } from '../helpers/run.js';

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
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-vp-present-')
    );
    try {
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({
          devDependencies: {
            vite: '^5.0.0',
            'vite-plugin-checker': '*',
          },
          name: 'checker-present',
        })
      );
      await fs.writeFile(
        path.join(tmpDir, 'vite.config.ts'),
        `import checker from 'vite-plugin-checker'\nexport default { plugins: [checker()] }\n`
      );
      const profile = await detectProject(tmpDir);
      await expect(run(viteCheckerTask.check(tmpDir, profile))).resolves.toBe(
        'skip'
      );
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
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
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-vp-apply-')
    );
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        devDependencies: {
          vite: '^5.0.0',
          'vite-plugin-checker': '*',
        },
        name: 'apply-test',
      })
    );
    await fs.writeFile(
      path.join(tmpDir, 'vite.config.ts'),
      `import { defineConfig } from 'vite'\nexport default defineConfig({})`
    );
    const profile = await detectProject(tmpDir);
    await run(viteCheckerTask.apply(tmpDir, profile));
    const content = await fs.readFile(
      path.join(tmpDir, 'vite.config.ts'),
      'utf-8'
    );
    expect(content).toContain('vite-plugin-checker');
    await fs.rm(tmpDir, { force: true, recursive: true });
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
