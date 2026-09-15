import {
  fixtureDir,
  fixtureProfile,
  withProject,
} from '@test/helpers/project.js';
import { run } from '@test/helpers/run.js';
import { describe, expect } from 'vite-plus/test';

import { gitignoreTsbuildinfoTask } from '../../packages/tasks/src/ts/gitignore-tsbuildinfo.js';
import { pathsTask } from '../../packages/tasks/src/ts/paths.js';
import { strictTask } from '../../packages/tasks/src/ts/strict.js';

describe('gitignoreTsbuildinfoTask', () => {
  test('is applicable to TS projects only', async () => {
    const tsProfile = await fixtureProfile('react-vite-tailwind');
    expect(gitignoreTsbuildinfoTask.applicable(tsProfile)).toBe(true);

    const nonTsProfile = await fixtureProfile('monorepo-turbo');
    expect(gitignoreTsbuildinfoTask.applicable(nonTsProfile)).toBe(false);
  });

  test('returns new when .gitignore is missing', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    const status = await run(
      gitignoreTsbuildinfoTask.check(fixtureDir('react-vite-tailwind'), profile)
    );
    expect(status).toBe('new');
  });

  test('dryRun returns correct content', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    const diffs = await run(
      gitignoreTsbuildinfoTask.dryRun(
        fixtureDir('react-vite-tailwind'),
        profile
      )
    );
    expect(diffs.length).toBe(1);
    expect(diffs[0].filepath).toBe('.gitignore');
    expect(diffs[0].before).toBeNull();
    expect(diffs[0].after).toContain('.tsbuildinfo');
  });
});

describe('strictTask', () => {
  test('is applicable to TS projects only', async () => {
    const tsProfile = await fixtureProfile('react-vite-tailwind');
    expect(strictTask.applicable(tsProfile)).toBe(true);

    const nonTsProfile = await fixtureProfile('monorepo-turbo');
    expect(strictTask.applicable(nonTsProfile)).toBe(false);
  });

  test('skips when strict is already enabled', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    const status = await run(
      strictTask.check(fixtureDir('react-vite-tailwind'), profile)
    );
    expect(status).toBe('skip');
  });

  test('returns conflict when strict is explicitly false', async () => {
    await withProject(
      {
        'package.json': {
          devDependencies: { typescript: '^5.3.0' },
          name: 'strict-false',
        },
        'tsconfig.json': {
          compilerOptions: { strict: false, target: 'ES2020' },
        },
      },
      async ({ cwd, profile }) => {
        const status = await run(strictTask.check(cwd, profile));
        expect(status).toBe('conflict');
      }
    );
  });

  test('returns patch when strict key is missing', async () => {
    await withProject(
      {
        'package.json': {
          devDependencies: { typescript: '^5.3.0' },
          name: 'strict-missing',
        },
        'tsconfig.json': {
          compilerOptions: { target: 'ES2020' },
        },
      },
      async ({ cwd, profile }) => {
        const status = await run(strictTask.check(cwd, profile));
        expect(status).toBe('patch');
      }
    );
  });

  test('writes all strict compiler options on apply', async () => {
    await withProject(
      {
        'package.json': {
          devDependencies: { typescript: '^5.3.0' },
          name: 'apply-test',
        },
        'tsconfig.json': {
          compilerOptions: { target: 'ES2020' },
        },
      },
      async ({ cwd, profile, readJson }) => {
        await run(strictTask.apply(cwd, profile));
        const content = await readJson<{
          compilerOptions: Record<string, unknown>;
        }>('tsconfig.json');
        expect(content.compilerOptions.strict).toBe(true);
        expect(content.compilerOptions.noUnusedLocals).toBe(true);
        expect(content.compilerOptions.noUnusedParameters).toBe(true);
        expect(content.compilerOptions.verbatimModuleSyntax).toBe(true);
      }
    );
  });
});

describe('pathsTask', () => {
  test('is applicable to TS projects only', async () => {
    const tsProfile = await fixtureProfile('react-vite-tailwind');
    expect(pathsTask.applicable(tsProfile)).toBe(true);

    const nonTsProfile = await fixtureProfile('monorepo-turbo');
    expect(pathsTask.applicable(nonTsProfile)).toBe(false);
  });

  test('skips when Vite path aliases already exist', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    const status = await run(
      pathsTask.check(fixtureDir('react-vite-tailwind'), profile)
    );
    expect(status).toBe('skip');
  });

  test('skips Next path aliases when already configured', async () => {
    const profile = await fixtureProfile('nextjs');
    const status = await run(pathsTask.check(fixtureDir('nextjs'), profile));
    const diffs = await run(pathsTask.dryRun(fixtureDir('nextjs'), profile));

    expect(status).toBe('skip');
    expect(diffs).toHaveLength(0);
  });

  test('adds src path aliases for non-Next TypeScript projects', async () => {
    const profile = await fixtureProfile('node-only');
    const status = await run(pathsTask.check(fixtureDir('node-only'), profile));
    const diffs = await run(pathsTask.dryRun(fixtureDir('node-only'), profile));

    expect(status).toBe('patch');
    expect(diffs[0].after).toContain('"baseUrl": "."');
    expect(diffs[0].after).toContain('"@/*"');
    expect(diffs[0].after).toContain('"./src/*"');
  });
});
