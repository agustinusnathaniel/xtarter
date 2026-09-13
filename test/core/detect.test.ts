import fs from 'node:fs/promises';
import path from 'node:path';
import { detectProject, runDiagnostics } from '@xtarterize/core';
import { describe, expect } from 'vite-plus/test';

import {
  DETECTOR_ENTRIES,
  DETECTOR_INPUTS,
  EXISTING_ENTRIES,
  existingKeys,
  inputById,
  lockfileInputs,
  rootFileInputByBasename,
  workspacePackageDirs,
} from '../../packages/core/src/detect/registry/index.js';
import { fixtureProfile, withProject } from '../helpers/project.js';
import { run } from '../helpers/run.js';
import { withTempDir } from '../helpers/temp.js';

describe('detectProject', () => {
  test('detects react-vite-tailwind correctly', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    expect(profile.framework).toBe('react');
    expect(profile.frameworkVersion).toBe('18.2.0');
    expect(profile.bundler).toBe('vite');
    expect(profile.router).toBeNull();
    expect(profile.styling).toContain('tailwind');
    expect(profile.runtime).toBe('browser');
    expect(profile.packageManager).toBe('pnpm');
    expect(profile.typescript).toBe(true);
    expect(profile.vitePlus).toBe(false);
    expect(profile.monorepo).toBe(false);
    expect(profile.monorepoTool).toBeNull();
    expect(profile.workspaceRoot).toBe(false);
    expect(profile.hasGitHub).toBe(false);
    expect(profile.hasGit).toBe(false);
    expect(profile.nodeVersion).toBe('18');
    expect(profile.existing.tsconfig).toBe(true);
    expect(profile.existing.viteConfig).toBe(true);
    expect(profile.existing.biome).toBe(false);
    expect(profile.existing.gitignore).toBe(false);
  });

  test('detects react-vite-no-styling correctly', async () => {
    const profile = await fixtureProfile('react-vite-no-styling');
    expect(profile.framework).toBe('react');
    expect(profile.bundler).toBe('vite');
    expect(profile.router).toBeNull();
    expect(profile.styling).toContain('vanilla');
    expect(profile.runtime).toBe('browser');
    expect(profile.packageManager).toBe('npm');
    expect(profile.typescript).toBe(true);
    expect(profile.vitePlus).toBe(false);
    expect(profile.hasGit).toBe(false);
    expect(profile.hasGitHub).toBe(false);
  });

  test('detects vue-vite correctly', async () => {
    const profile = await fixtureProfile('vue-vite');
    expect(profile.framework).toBe('vue');
    expect(profile.frameworkVersion).toBe('3.4.0');
    expect(profile.bundler).toBe('vite');
    expect(profile.router).toBeNull();
    expect(profile.runtime).toBe('browser');
    expect(profile.packageManager).toBe('pnpm');
    expect(profile.typescript).toBe(true);
    expect(profile.vitePlus).toBe(false);
    expect(profile.hasGit).toBe(false);
  });

  test('detects nextjs correctly', async () => {
    const profile = await fixtureProfile('nextjs');
    expect(profile.framework).toBe('react');
    expect(profile.frameworkVersion).toBe('18.2.0');
    expect(profile.bundler).toBe('nextjs');
    expect(profile.router).toBe('next');
    expect(profile.runtime).toBe('edge');
    expect(profile.packageManager).toBe('pnpm');
    expect(profile.typescript).toBe(true);
    expect(profile.vitePlus).toBe(false);
    expect(profile.hasGit).toBe(false);
  });

  test('detects react-native-expo correctly', async () => {
    const profile = await fixtureProfile('react-native-expo');
    // Framework is react-native when both react and react-native are present
    expect(profile.framework).toBe('react-native');
    expect(profile.bundler).toBe('expo');
    expect(profile.router).toBe('expo-router');
    // runtime is native because bundler is expo (React Native)
    expect(profile.runtime).toBe('native');
    expect(profile.packageManager).toBe('yarn');
    expect(profile.styling).toContain('vanilla');
    expect(profile.typescript).toBe(true);
    expect(profile.vitePlus).toBe(false);
    expect(profile.hasGit).toBe(false);
  });

  test('detects node-only correctly', async () => {
    const profile = await fixtureProfile('node-only');
    expect(profile.framework).toBe('node');
    expect(profile.frameworkVersion).toBeNull();
    expect(profile.bundler).toBe('none');
    expect(profile.router).toBeNull();
    expect(profile.runtime).toBe('node');
    expect(profile.packageManager).toBe('pnpm');
    expect(profile.typescript).toBe(true);
    expect(profile.vitePlus).toBe(false);
    expect(profile.hasGit).toBe(false);
  });

  test('detects monorepo-turbo correctly', async () => {
    const profile = await fixtureProfile('monorepo-turbo');
    expect(profile.monorepo).toBe(true);
    expect(profile.monorepoTool).toBe('turbo');
    expect(profile.workspaceRoot).toBe(true);
    expect(profile.framework).toBe('node');
    expect(profile.bundler).toBe('none');
    expect(profile.runtime).toBe('node');
    expect(profile.packageManager).toBe('pnpm');
    expect(profile.typescript).toBe(false);
    expect(profile.vitePlus).toBe(false);
    expect(profile.hasGit).toBe(false);
  });

  test('detects monorepo when running inside workspace package', async () => {
    await withTempDir('xtarterize-workspace-', async (root) => {
      await fs.mkdir(path.join(root, '.git'), { recursive: true });
      await fs.writeFile(
        path.join(root, 'pnpm-workspace.yaml'),
        'packages:\n  - apps/*\n'
      );
      await fs.writeFile(
        path.join(root, 'package.json'),
        JSON.stringify({ name: 'workspace-root', version: '1.0.0' })
      );

      const appDir = path.join(root, 'apps', 'web');
      await fs.mkdir(appDir, { recursive: true });
      await fs.writeFile(
        path.join(appDir, 'package.json'),
        JSON.stringify({ name: 'web-app', version: '1.0.0' })
      );

      const profile = await detectProject(appDir);
      expect(profile.monorepo).toBe(true);
      expect(profile.workspaceRoot).toBe(false);
      expect(profile.monorepoTool).toBeNull();
    });
  });

  test('detects bundlers from config files when dependencies are absent', async () => {
    const cases = [
      ['vite.config.mjs', 'vite'],
      ['next.config.mjs', 'nextjs'],
      ['webpack.config.cjs', 'webpack'],
      ['rspack.config.ts', 'rspack'],
    ] as const;

    for (const [configFile, expectedBundler] of cases) {
      await withProject(
        {
          'package.json': { dependencies: {} },
          [configFile]: 'export default {}\n',
        },
        async ({ profile }) => {
          expect(profile.bundler).toBe(expectedBundler);
        }
      );
    }
  });

  test('keeps dependency bundler detection ahead of config files', async () => {
    await withProject(
      {
        'next.config.js': 'export default {}\n',
        'package.json': { dependencies: { vite: '^5.0.0' } },
      },
      async ({ profile }) => {
        expect(profile.bundler).toBe('vite');
      }
    );
  });

  test('nodeVersion defaults to 22 when no config present', async () => {
    await withProject(
      { 'package.json': { name: 'test-pkg' } },
      async ({ profile }) => {
        expect(profile.nodeVersion).toBe('22');
      }
    );
  });

  test('nodeVersion reads from .nvmrc', async () => {
    await withProject(
      { '.nvmrc': '22\n', 'package.json': { name: 'test-pkg' } },
      async ({ profile }) => {
        expect(profile.nodeVersion).toBe('22');
      }
    );
  });

  test('nodeVersion reads from .nvmrc stripping leading v', async () => {
    await withProject(
      { '.nvmrc': 'v18\n', 'package.json': { name: 'test-pkg' } },
      async ({ profile }) => {
        expect(profile.nodeVersion).toBe('18');
      }
    );
  });

  test('nodeVersion falls back to engines.node from package.json', async () => {
    await withProject(
      {
        'package.json': { engines: { node: '>=22' }, name: 'test-pkg' },
      },
      async ({ profile }) => {
        expect(profile.nodeVersion).toBe('22');
      }
    );
  });

  test('nodeVersion prefers .nvmrc over engines.node', async () => {
    await withProject(
      {
        '.nvmrc': '20\n',
        'package.json': { engines: { node: '22' }, name: 'test-pkg' },
      },
      async ({ profile }) => {
        expect(profile.nodeVersion).toBe('20');
      }
    );
  });

  test('detects Vite+ from vite-plus dep', async () => {
    await withProject(
      {
        'package.json': {
          devDependencies: { 'vite-plus': '^0.1.0' },
          name: 'vp-project',
        },
      },
      async ({ profile }) => {
        expect(profile.vitePlus).toBe(true);
      }
    );
  });

  test('detects Vite+ from fixtures/vite-plus-no-lint', async () => {
    const profile = await fixtureProfile('vite-plus-no-lint');
    expect(profile.vitePlus).toBe(true);
    expect(profile.existing.biome).toBe(false);
    expect(profile.existing.eslint).toBe(false);
    expect(profile.existing.oxlint).toBe(false);
    expect(profile.existing.oxfmt).toBe(false);
  });

  test('detects Vite+ with biome in vite-plus-biome fixture', async () => {
    const profile = await fixtureProfile('vite-plus-biome');
    expect(profile.vitePlus).toBe(true);
    expect(profile.existing.biome).toBe(true);
  });

  test('detects ESLint from dep', async () => {
    await withProject(
      {
        'package.json': {
          devDependencies: { eslint: '^8.56.0' },
          name: 'eslint-project',
        },
      },
      async ({ profile }) => {
        expect(profile.existing.eslint).toBe(true);
      }
    );
  });

  test('detects ESLint from eslintrc config', async () => {
    await withProject(
      {
        '.eslintrc.json': { rules: {} },
        'package.json': { name: 'eslint-project' },
      },
      async ({ profile }) => {
        expect(profile.existing.eslint).toBe(true);
      }
    );
  });

  test('detects ESLint from eslint.config flat config', async () => {
    await withProject(
      {
        'eslint.config.js': 'export default []',
        'package.json': { name: 'eslint-flat' },
      },
      async ({ profile }) => {
        expect(profile.existing.eslint).toBe(true);
      }
    );
  });

  test('detects oxlint config', async () => {
    await withProject(
      {
        '.oxlintrc.json': { rules: {} },
        'package.json': { name: 'oxlint-project' },
      },
      async ({ profile }) => {
        expect(profile.existing.oxlint).toBe(true);
      }
    );
  });

  test('detects oxfmt config', async () => {
    await withProject(
      {
        '.oxfmtrc.json': { indentStyle: 'space' },
        'package.json': { name: 'oxfmt-project' },
      },
      async ({ profile }) => {
        expect(profile.existing.oxfmt).toBe(true);
      }
    );
  });

  test('detects ESLint from fixtures/eslint-project', async () => {
    const profile = await fixtureProfile('eslint-project');
    expect(profile.existing.eslint).toBe(true);
    expect(profile.existing.biome).toBe(false);
  });

  test('detects oxlint standalone from fixtures/oxlint-standalone', async () => {
    const profile = await fixtureProfile('oxlint-standalone');
    expect(profile.existing.oxlint).toBe(true);
    expect(profile.vitePlus).toBe(false);
    expect(profile.existing.biome).toBe(false);
    expect(profile.existing.eslint).toBe(false);
  });

  test('detects .eslintrc.mjs consistently with the doctor legacy check', async () => {
    await withProject(
      {
        '.eslintrc.mjs': 'export default {}\n',
        'package.json': { name: 'legacy-eslint-project' },
      },
      async ({ cwd, profile }) => {
        expect(profile.existing.eslint).toBe(true);

        const { groups } = await run(
          runDiagnostics(cwd, {
            groups: ['configuration'],
          })
        );
        const checks = groups.flatMap((group) => group.checks);
        const legacyCheck = checks.find(
          (check) => check.name === 'Legacy config'
        );
        expect(legacyCheck?.message).toContain('.eslintrc.mjs');
      }
    );
  });

  test('tsconfig.jsonc sets both existing.tsconfig and typescript', async () => {
    await withProject(
      {
        'package.json': { name: 'jsonc-tsconfig-project' },
        'tsconfig.jsonc': { compilerOptions: {} },
      },
      async ({ profile }) => {
        expect(profile.existing.tsconfig).toBe(true);
        expect(profile.typescript).toBe(true);
      }
    );
  });

  test('detects a workspace package under services/ from workspace dirs', async () => {
    await withTempDir('xtarterize-services-', async (root) => {
      await fs.mkdir(path.join(root, 'packages'), { recursive: true });
      const apiDir = path.join(root, 'services', 'api');
      await fs.mkdir(apiDir, { recursive: true });
      await fs.writeFile(
        path.join(apiDir, 'package.json'),
        JSON.stringify({ name: 'api', version: '1.0.0' })
      );

      const profile = await detectProject(apiDir);
      expect(profile.monorepo).toBe(true);
      expect(profile.workspaceRoot).toBe(false);
      expect(profile.monorepoTool).toBeNull();
    });
  });
});

describe('detection registry integrity', () => {
  test('declares unique input and entry ids', () => {
    const inputIds = DETECTOR_INPUTS.map((input) => input.id);
    expect(new Set(inputIds).size).toBe(inputIds.length);

    const entryIds = DETECTOR_ENTRIES.map((entry) => entry.id);
    expect(new Set(entryIds).size).toBe(entryIds.length);
  });

  test('every entry declares at least one registered input', () => {
    for (const entry of DETECTOR_ENTRIES) {
      expect(entry.inputs.length).toBeGreaterThan(0);
      for (const inputId of entry.inputs) {
        expect(() => inputById(inputId)).not.toThrow();
      }
    }
  });

  test('declares the drift-prone inputs used by detection', () => {
    const lockfileNames = lockfileInputs().map((input) => input.name);
    expect(lockfileNames).toContain('bun.lock');
    expect(lockfileNames).toContain('bun.lockb');
    expect(workspacePackageDirs()).toContain('services');
    expect(rootFileInputByBasename('.eslintrc')?.extensions).toContain('.mjs');
    expect(rootFileInputByBasename('tsconfig')?.extensions).toContain('.jsonc');
  });

  test('detection produces every derived existing key with the declared kind', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    expect(Object.keys(profile.existing).sort()).toEqual(
      [...existingKeys()].sort()
    );

    for (const entry of EXISTING_ENTRIES) {
      const value = profile.existing[entry.key];
      if (entry.existing === 'list') {
        expect(Array.isArray(value)).toBe(true);
      } else {
        expect(typeof value).toBe('boolean');
      }
    }
  });
});
