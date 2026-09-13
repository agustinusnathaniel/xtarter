import { describe, expect } from 'vite-plus/test';

import { packageEnginesTask } from '../../packages/tasks/src/quality/package-engines.js';
import {
  fixtureDir,
  fixtureProfile,
  type ProjectContext,
  type ProjectFileMap,
  withProject,
} from '../helpers/project.js';
import { run } from '../helpers/run.js';

const EXPECTED_DEV_ENGINES = {
  packageManager: { name: 'pnpm', version: '>=9' },
  runtime: { name: 'node', version: '>=18' },
};

interface DevEnginesCase {
  files: ProjectFileMap;
  name: string;
  verify: (context: ProjectContext) => Promise<void>;
}

const devEnginesCases: Array<DevEnginesCase> = [
  {
    files: {
      '.nvmrc': '18\n',
      'package.json': {
        devEngines: EXPECTED_DEV_ENGINES,
        name: 'engines-test',
      },
    },
    name: 'skips when devEngines already matches',
    verify: async ({ cwd, profile }) => {
      const status = await run(packageEnginesTask.check(cwd, profile));
      expect(status).toBe('skip');
    },
  },
  {
    files: {
      'package.json': {
        devEngines: {
          packageManager: { name: 'pnpm', version: '>=8' },
          runtime: { name: 'node', version: '>=18' },
        },
        name: 'engines-test',
      },
    },
    name: 'skips when devEngines already exists (merge keeps existing values)',
    verify: async ({ cwd, profile }) => {
      const status = await run(packageEnginesTask.check(cwd, profile));
      expect(status).toBe('skip');
    },
  },
  {
    files: {
      '.nvmrc': '20.11.1\n',
      'package.json': { name: 'engines-test' },
    },
    name: 'derives runtime floor from .nvmrc',
    verify: async ({ cwd, profile }) => {
      const diffs = await run(packageEnginesTask.dryRun(cwd, profile));
      expect(diffs.length).toBe(1);
      expect(JSON.parse(diffs[0].after).devEngines).toEqual({
        packageManager: { name: 'pnpm', version: '>=9' },
        runtime: { name: 'node', version: '>=20' },
      });
    },
  },
  {
    files: {
      'package.json': {
        engines: { node: '^22.14.0' },
        name: 'engines-test',
      },
    },
    name: 'derives runtime floor from engines.node',
    verify: async ({ cwd, profile }) => {
      const diffs = await run(packageEnginesTask.dryRun(cwd, profile));
      expect(diffs.length).toBe(1);
      expect(JSON.parse(diffs[0].after).devEngines).toEqual({
        packageManager: { name: 'pnpm', version: '>=9' },
        runtime: { name: 'node', version: '>=22' },
      });
    },
  },
  {
    files: {
      'package.json': {
        name: 'engines-test',
        packageManager: 'pnpm@11.8.0',
      },
    },
    name: 'derives package manager floor from packageManager field',
    verify: async ({ cwd, profile }) => {
      const diffs = await run(packageEnginesTask.dryRun(cwd, profile));
      expect(diffs.length).toBe(1);
      const devEngines = JSON.parse(diffs[0].after).devEngines;
      expect(devEngines.packageManager.version).toBe('>=11.8.0');
    },
  },
  {
    files: {
      '.nvmrc': '18\n',
      'package.json': { devDependencies: {}, name: 'engines-test' },
    },
    name: 'apply writes devEngines to package.json',
    verify: async ({ cwd, profile, readJson }) => {
      await run(packageEnginesTask.apply(cwd, profile));
      const content = await readJson<{ devEngines: unknown }>('package.json');
      expect(content.devEngines).toEqual(EXPECTED_DEV_ENGINES);
    },
  },
];

describe('packageEnginesTask', () => {
  test('is applicable to all projects', async () => {
    const tsProfile = await fixtureProfile('react-vite-tailwind');
    expect(packageEnginesTask.applicable(tsProfile)).toBe(true);

    const nonTsProfile = await fixtureProfile('monorepo-turbo');
    expect(packageEnginesTask.applicable(nonTsProfile)).toBe(true);
  });

  test('returns patch when devEngines is missing from package.json', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    const status = await run(
      packageEnginesTask.check(fixtureDir('react-vite-tailwind'), profile)
    );
    expect(status).toBe('patch');
  });

  test('dryRun shows devEngines diff', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    const diffs = await run(
      packageEnginesTask.dryRun(fixtureDir('react-vite-tailwind'), profile)
    );
    expect(diffs.length).toBe(1);
    expect(diffs[0].filepath).toBe('package.json');
    expect(JSON.parse(diffs[0].after).devEngines).toEqual(EXPECTED_DEV_ENGINES);
  });

  for (const { files, name, verify } of devEnginesCases) {
    test(name, () => withProject(files, verify));
  }
});
