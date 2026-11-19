import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { biomeTask, createBiomeTask } from '@tasks/lint/biome.js';
import { oxfmtTask, oxlintTask } from '@tasks/lint/oxlint.js';
import {
  fixtureDir,
  fixtureProfile,
  withProject,
} from '@test/helpers/project.js';
import { run } from '@test/helpers/run.js';
import { describe, expect } from 'vite-plus/test';

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

describe('biomeTask config forms', () => {
  test('creates a managed config extending @xtarter/config by default', async () => {
    const profile = await fixtureProfile('react-vite-no-styling');
    const cwd = fixtureDir('react-vite-no-styling');
    const diffs = await run(biomeTask.dryRun(cwd, profile));
    const config = JSON.parse(diffs[0].after ?? '{}');
    expect(config.extends).toEqual([
      '@xtarter/config/biome/core',
      '@xtarter/config/biome/react',
    ]);
    expect(config.linter).toBeUndefined();
    expect(config.files.includes).toContain('src/**/*');
    const deps = await run(biomeTask.getDeps(cwd, profile));
    expect(deps.map((dep) => dep.depName)).toContain('@xtarter/config');
  });

  test('creates the ejected config with --eject', async () => {
    const profile = await fixtureProfile('react-vite-no-styling');
    const cwd = fixtureDir('react-vite-no-styling');
    const ejected = createBiomeTask({ eject: true });
    const diffs = await run(ejected.dryRun(cwd, profile));
    const config = JSON.parse(diffs[0].after ?? '{}');
    expect(config.extends).toEqual([
      'ultracite/biome/core',
      'ultracite/biome/react',
    ]);
    expect(config.linter.rules.style.useBlockStatements).toBe('error');
    const deps = await run(ejected.getDeps(cwd, profile));
    expect(deps.map((dep) => dep.depName)).not.toContain('@xtarter/config');
  });
});

describe('biomeTask existing configs', () => {
  test('keeps an existing ejected config ejected', async () => {
    await withProject(
      {
        'biome.json': {
          extends: ['ultracite/biome/core'],
          overrides: [
            {
              includes: ['*.test.ts'],
              linter: { rules: { nursery: { useConsistentTestIt: 'error' } } },
            },
          ],
        },
        'package.json': {
          devDependencies: { '@biomejs/biome': '^2.6.0' },
          name: 'biome-ejected',
          type: 'module',
        },
      },
      async ({ cwd, profile }) => {
        const [diff] = await run(biomeTask.dryRun(cwd, profile));
        const config = JSON.parse(diff.after);
        expect(config.extends).toEqual(['ultracite/biome/core']);
        expect(config.linter.rules.style.useBlockStatements).toBe('error');
        // Biome 2.6 rejects the rule under nursery, so it moves to style.
        expect(config.overrides[0].linter.rules.nursery).toBeUndefined();
        expect(config.overrides[0].linter.rules.style.useConsistentTestIt).toBe(
          'error'
        );
      }
    );
  });

  test('adds only missing layers to a managed config and then skips', async () => {
    await withProject(
      {
        'biome.json': {
          extends: ['@xtarter/config/biome/core', './biome.local.json'],
          linter: { rules: { style: { noNonNullAssertion: 'off' } } },
        },
        'package.json': {
          dependencies: { react: '^19.0.0' },
          devDependencies: {
            '@biomejs/biome': '^2.6.0',
            '@xtarter/config': '^0.1.0',
            ultracite: '^8.1.1',
          },
          name: 'biome-managed',
          type: 'module',
        },
      },
      async ({ cwd, profile }) => {
        const [diff] = await run(biomeTask.dryRun(cwd, profile));
        const config = JSON.parse(diff.after);
        expect(config.extends).toEqual([
          '@xtarter/config/biome/core',
          './biome.local.json',
          '@xtarter/config/biome/react',
        ]);
        expect(config.linter.rules.style).toEqual({
          noNonNullAssertion: 'off',
        });
        expect(config.files).toBeUndefined();
        await writeFile(join(cwd, 'biome.json'), diff.after);
        await expect(run(biomeTask.check(cwd, profile))).resolves.toBe('skip');
      }
    );
  });

  test('is not applicable when Prettier is detected', async () => {
    await withProject(
      {
        '.prettierrc': '{}',
        'package.json': { name: 'prettier-project', type: 'module' },
      },
      async ({ profile }) => {
        expect(profile.existing.prettier).toBe(true);
        expect(biomeTask.applicable(profile)).toBe(false);
      }
    );
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
        // Vite+ reads `lint` from vite.config, not oxlint.config.ts.
        expect(diffs[0].filepath).toBe('vite.config.ts');
        expect(diffs[0].before).toBeNull();
        expect(diffs[0].after).toContain('lint: {');
        expect(diffs[0].after).toContain('@xtarter/config/oxlint/core');
      }
    );
  });
});

describe('oxfmtTask', () => {
  test('skips for Prettier but not for ESLint', async () => {
    await withProject(
      {
        'package.json': {
          devDependencies: { prettier: '^3.0.0', 'vite-plus': '^0.1.0' },
          name: 'vp-prettier',
          type: 'module',
        },
      },
      async ({ profile }) => {
        expect(oxfmtTask.applicable(profile)).toBe(false);
        expect(oxlintTask.applicable(profile)).toBe(true);
      }
    );
    await withProject(
      {
        'package.json': {
          devDependencies: { eslint: '^9.0.0', 'vite-plus': '^0.1.0' },
          name: 'vp-eslint',
          type: 'module',
        },
      },
      async ({ profile }) => {
        expect(oxfmtTask.applicable(profile)).toBe(true);
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
        const diffs = await run(oxfmtTask.dryRun(cwd, profile));

        expect(diffs.length).toBeGreaterThan(0);
        // Vite+ reads `fmt` from vite.config, not oxfmt.config.ts.
        expect(diffs[0].filepath).toBe('vite.config.ts');
        expect(diffs[0].before).toBeNull();
        expect(diffs[0].after).toContain('fmt: {');
        expect(diffs[0].after).toContain('@xtarter/config/oxfmt');
      }
    );
  });
});
