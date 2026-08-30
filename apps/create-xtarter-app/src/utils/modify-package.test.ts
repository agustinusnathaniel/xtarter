import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vite-plus/test';

import { cleanCIConfigs, modifyPackageJson } from '@/utils/modify-package';

async function createTempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'cxa-test-'));
}

describe('modifyPackageJson', () => {
  test('should set package name from project name', async () => {
    const dir = await createTempDir();
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'template-name', version: '1.0.0' })
    );

    await modifyPackageJson({ projectName: 'my-app', projectPath: dir });

    const content = await readFile(join(dir, 'package.json'), 'utf-8');
    const pkg = JSON.parse(content);
    expect(pkg.name).toBe('my-app');
    await rm(dir, { force: true, recursive: true });
  });

  test('should lowercase and sanitize project name', async () => {
    const dir = await createTempDir();
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'old-name' })
    );

    await modifyPackageJson({ projectName: 'My_Cool-App', projectPath: dir });

    const content = await readFile(join(dir, 'package.json'), 'utf-8');
    const pkg = JSON.parse(content);
    expect(pkg.name).toBe('my-cool-app');
    await rm(dir, { force: true, recursive: true });
  });

  test('should remove workspace protocol overrides', async () => {
    const dir = await createTempDir();
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({
        name: 'template',
        pnpm: {
          overrides: {
            'eslint-config-custom': 'workspace:*',
            'normal-dep': '^1.0.0',
            tsconfig: 'workspace:*',
          },
        },
      })
    );

    await modifyPackageJson({ projectName: 'test', projectPath: dir });

    const content = await readFile(join(dir, 'package.json'), 'utf-8');
    const pkg = JSON.parse(content);
    expect(pkg.pnpm.overrides).not.toHaveProperty('eslint-config-custom');
    expect(pkg.pnpm.overrides).not.toHaveProperty('tsconfig');
    expect(pkg.pnpm.overrides['normal-dep']).toBe('^1.0.0');
    await rm(dir, { force: true, recursive: true });
  });

  test('should warn if package.json is missing', async () => {
    const dir = await createTempDir();
    const result = modifyPackageJson({ projectName: 'test', projectPath: dir });
    await expect(result).resolves.toBeUndefined();
    await rm(dir, { force: true, recursive: true });
  });
});

describe('cleanCIConfigs', () => {
  test('should remove .github directory', async () => {
    const dir = await createTempDir();
    const githubDir = join(dir, '.github');
    const workflowsDir = join(githubDir, 'workflows');
    await mkdir(workflowsDir, { recursive: true });
    await writeFile(join(workflowsDir, 'ci.yml'), 'name: CI');

    await cleanCIConfigs({ projectPath: dir });

    const { access } = await import('node:fs/promises');
    await expect(access(githubDir)).rejects.toThrow();
    await rm(dir, { force: true, recursive: true });
  });

  test('should remove vercel.json', async () => {
    const dir = await createTempDir();
    await writeFile(join(dir, 'vercel.json'), JSON.stringify({}));

    await cleanCIConfigs({ projectPath: dir });

    const { access } = await import('node:fs/promises');
    await expect(access(join(dir, 'vercel.json'))).rejects.toThrow();
    await rm(dir, { force: true, recursive: true });
  });

  test('should be idempotent (cleaning twice)', async () => {
    const dir = await createTempDir();
    await writeFile(join(dir, 'vercel.json'), JSON.stringify({}));

    await cleanCIConfigs({ projectPath: dir });
    await cleanCIConfigs({ projectPath: dir });

    const { access } = await import('node:fs/promises');
    await expect(access(join(dir, 'vercel.json'))).rejects.toThrow();
    await rm(dir, { force: true, recursive: true });
  });
});
