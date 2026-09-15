import {
  fixtureDir,
  fixtureProfile,
  withProject,
} from '@test/helpers/project.js';
import { run } from '@test/helpers/run.js';
import { describe, expect } from 'vite-plus/test';

import { npmrcTask } from '../../packages/tasks/src/npmrc.js';
import { lintStagedTask } from '../../packages/tasks/src/quality/lint-staged.js';

describe('npmrcTask', () => {
  test('applies to any project', () => {
    expect(npmrcTask.applicable({} as never)).toBe(true);
  });

  test('returns new on clean fixture', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    const status = await run(
      npmrcTask.check(fixtureDir('react-vite-tailwind'), profile)
    );
    expect(status).toBe('new');
  });

  test('returns expected content in dryRun', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    const diffs = await run(
      npmrcTask.dryRun(fixtureDir('react-vite-tailwind'), profile)
    );
    expect(diffs[0].filepath).toBe('.npmrc');
    expect(diffs[0].after).toContain('save-exact=true');
  });

  test('apply writes the expected file', async () => {
    await withProject(
      { 'package.json': { name: 'apply-test' } },
      async ({ cwd, profile, readText }) => {
        await run(npmrcTask.apply(cwd, profile));
        await expect(readText('.npmrc')).resolves.toBeDefined();
      }
    );
  });
});

describe('lintStagedTask', () => {
  test('applies to any project', () => {
    expect(lintStagedTask.applicable({} as never)).toBe(true);
  });

  test('returns patch when config and dependency are missing', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    const status = await run(
      lintStagedTask.check(fixtureDir('react-vite-tailwind'), profile)
    );
    expect(status).toBe('patch');
  });

  test('uses biome check by default in dryRun', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    const diffs = await run(
      lintStagedTask.dryRun(fixtureDir('react-vite-tailwind'), profile)
    );
    const diff = diffs.find((d) => d.filepath === '.lintstagedrc.json');
    expect(diff?.after).toContain('biome check');
  });

  test('uses ultracite when present', async () => {
    await withProject(
      {
        'package.json': {
          devDependencies: { ultracite: '^1.0.0' },
          name: 'ultracite-test',
        },
      },
      async ({ cwd, profile }) => {
        const diffs = await run(lintStagedTask.dryRun(cwd, profile));
        const diff = diffs.find((d) => d.filepath === '.lintstagedrc.json');
        expect(diff?.after).toContain('ultracite fix');
      }
    );
  });
});
