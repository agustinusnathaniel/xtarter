import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectProject } from '@xtarterize/core';
import { viteCheckerTask, viteVisualizerTask } from '@xtarterize/tasks';
import { describe, expect } from 'vite-plus/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.resolve(__dirname, '../fixtures');

describe('viteCheckerTask', () => {
  test('is applicable to vite projects only', async () => {
    const viteProfile = await detectProject(
      path.join(fixtures, 'react-vite-tailwind')
    );
    expect(viteCheckerTask.applicable(viteProfile)).toBe(true);

    const nextProfile = await detectProject(path.join(fixtures, 'nextjs'));
    expect(viteCheckerTask.applicable(nextProfile)).toBe(false);
  });

  test('returns new when plugin is not present', async () => {
    const profile = await detectProject(
      path.join(fixtures, 'react-vite-tailwind')
    );
    const status = await viteCheckerTask.check(
      path.join(fixtures, 'react-vite-tailwind'),
      profile
    );
    expect(status).toBe('new');
  });

  test('dryRun returns vite.config diff', async () => {
    const profile = await detectProject(
      path.join(fixtures, 'react-vite-tailwind')
    );
    const diffs = await viteCheckerTask.dryRun(
      path.join(fixtures, 'react-vite-tailwind'),
      profile
    );
    expect(diffs.length).toBe(1);
    expect(diffs[0].filepath).toBe('vite.config');
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
    await viteCheckerTask.apply(tmpDir, profile);
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
    const viteProfile = await detectProject(
      path.join(fixtures, 'react-vite-tailwind')
    );
    expect(viteVisualizerTask.applicable(viteProfile)).toBe(true);
  });

  test('returns new when plugin is not present', async () => {
    const profile = await detectProject(
      path.join(fixtures, 'react-vite-tailwind')
    );
    const status = await viteVisualizerTask.check(
      path.join(fixtures, 'react-vite-tailwind'),
      profile
    );
    expect(status).toBe('new');
  });
});
