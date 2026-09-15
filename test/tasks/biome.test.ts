import {
  fixtureDir,
  fixtureProfile,
  withProject,
} from '@test/helpers/project.js';
import { run } from '@test/helpers/run.js';
import { describe, expect } from 'vite-plus/test';

import { biomeTask } from '../../packages/tasks/src/lint/biome.js';
import { oxfmtTask, oxlintTask } from '../../packages/tasks/src/lint/oxlint.js';

describe('biomeTask', () => {
  test('is applicable to project with biome dep', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    expect(biomeTask.applicable(profile)).toBe(true);
  });

  test('is not applicable when ESLint is detected', async () => {
    await withProject(
      {
        'package.json': {
          devDependencies: { eslint: '^8.56.0' },
          name: 'eslint-project',
          type: 'module',
        },
      },
      async ({ profile }) => {
        expect(biomeTask.applicable(profile)).toBe(false);
      }
    );
  });

  test('is not applicable when oxlint config exists', async () => {
    await withProject(
      {
        '.oxlintrc.json': { rules: { 'no-console': 'error' } },
        'package.json': { name: 'oxlint-standalone', type: 'module' },
      },
      async ({ profile }) => {
        expect(biomeTask.applicable(profile)).toBe(false);
      }
    );
  });

  test('is applicable to Vite+ project with existing biome dep', async () => {
    await withProject(
      {
        'biome.json': {
          $schema: './node_modules/@biomejs/biome/configuration_schema.json',
        },
        'package.json': {
          devDependencies: {
            '@biomejs/biome': '^2.4.0',
            'vite-plus': '^0.1.0',
          },
          name: 'vp-biome',
          type: 'module',
        },
      },
      async ({ profile }) => {
        expect(biomeTask.applicable(profile)).toBe(true);
      }
    );
  });
});

describe('biomeTask', () => {
  test('is not applicable to Vite+ project without biome dep', async () => {
    await withProject(
      {
        'package.json': {
          devDependencies: { 'vite-plus': '^0.1.0' },
          name: 'vp-only',
          type: 'module',
        },
      },
      async ({ profile }) => {
        expect(biomeTask.applicable(profile)).toBe(false);
      }
    );
  });

  test('returns new on clean fixture', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    const status = await run(
      biomeTask.check(fixtureDir('react-vite-tailwind'), profile)
    );
    expect(status).toBe('new');
  });

  test('dryRun returns diffs', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    const diffs = await run(
      biomeTask.dryRun(fixtureDir('react-vite-tailwind'), profile)
    );
    expect(diffs.length).toBeGreaterThan(0);
    expect(diffs[0].filepath).toBe('biome.json');
    expect(diffs[0].before).toBeNull();
  });

  test('includes css.tailwindDirectives for tailwind projects', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    const diffs = await run(
      biomeTask.dryRun(fixtureDir('react-vite-tailwind'), profile)
    );
    const config = JSON.parse(diffs[0].after ?? '{}');
    expect(config.css?.parser?.tailwindDirectives).toBe(true);
  });

  test('excludes css.tailwindDirectives for non-tailwind projects', async () => {
    const profile = await fixtureProfile('react-vite-no-styling');
    const diffs = await run(
      biomeTask.dryRun(fixtureDir('react-vite-no-styling'), profile)
    );
    const config = JSON.parse(diffs[0].after ?? '{}');
    expect(config.css).toBeUndefined();
  });
});

describe('oxlintTask', () => {
  test('is applicable when Vite+ is detected', async () => {
    await withProject(
      {
        'package.json': {
          devDependencies: { 'vite-plus': '^0.1.0' },
          name: 'vp-project',
          type: 'module',
        },
      },
      async ({ profile }) => {
        expect(oxlintTask.applicable(profile)).toBe(true);
      }
    );
  });

  test('is not applicable when ESLint is detected', async () => {
    await withProject(
      {
        'package.json': {
          devDependencies: { eslint: '^8.56.0' },
          name: 'eslint-project',
          type: 'module',
        },
      },
      async ({ profile }) => {
        expect(oxlintTask.applicable(profile)).toBe(false);
      }
    );
  });

  test('is not applicable when biome is already set up', async () => {
    await withProject(
      {
        'package.json': {
          devDependencies: { '@biomejs/biome': '^2.4.0' },
          name: 'biome-project',
          type: 'module',
        },
      },
      async ({ profile }) => {
        expect(oxlintTask.applicable(profile)).toBe(false);
      }
    );
  });

  test('returns config diff on dryRun for Vite+ project', async () => {
    await withProject(
      {
        'package.json': {
          devDependencies: { 'vite-plus': '^0.1.0' },
          name: 'vp-project',
          type: 'module',
        },
      },
      async ({ cwd, profile }) => {
        const diffs = await run(oxlintTask.dryRun(cwd, profile));

        expect(diffs.length).toBeGreaterThan(0);
        expect(diffs[0].filepath).toBe('oxlint.config.ts');
        expect(diffs[0].before).toBeNull();
        expect(diffs[0].after).toContain('no-console');
      }
    );
  });
});

describe('oxfmtTask', () => {
  test('returns config diff on dryRun for Vite+ project', async () => {
    await withProject(
      {
        'package.json': {
          devDependencies: { 'vite-plus': '^0.1.0' },
          name: 'vp-project',
          type: 'module',
        },
      },
      async ({ cwd, profile }) => {
        const diffs = await run(oxfmtTask.dryRun(cwd, profile));

        expect(diffs.length).toBeGreaterThan(0);
        expect(diffs[0].filepath).toBe('oxfmt.config.ts');
        expect(diffs[0].before).toBeNull();
        expect(diffs[0].after).toContain('singleQuote');
      }
    );
  });
});
