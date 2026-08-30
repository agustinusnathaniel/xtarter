import { existsSync } from 'node:fs';
import {
  access,
  mkdir,
  readdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vite-plus/test';

import {
  prepareProjectDir,
  resolveProjectPath,
  scaffoldProject,
} from '@/scaffold';
import { TEMPLATES } from '@/templates/registry';

function tempDir() {
  return join(
    tmpdir(),
    `cxa-scaffold-test-${Math.random().toString(36).slice(2, 8)}`
  );
}

async function writeFixture(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, 'package.json'),
    JSON.stringify({ name: 'template', version: '1.0.0' })
  );
}

describe('resolveProjectPath', () => {
  test('should resolve a named project path', () => {
    const result = resolveProjectPath('my-app');
    expect(result.projectName).toBe('my-app');
    expect(result.projectPath).toContain('my-app');
  });

  test('should resolve "." to cwd with basename', () => {
    const result = resolveProjectPath('.');
    expect(result.projectPath).toBe(process.cwd());
    expect(result.projectName).toBeDefined();
    expect(result.projectName.length).toBeGreaterThan(0);
  });

  test('should throw for empty name', () => {
    expect(() => resolveProjectPath('')).toThrow('Project name is required');
  });
});

describe('prepareProjectDir', () => {
  test('should create a new directory', async () => {
    const dir = tempDir();
    await prepareProjectDir('test', dir);
    await expect(access(dir)).resolves.toBeUndefined();
    await rm(dir, { force: true, recursive: true });
  });

  test('should accept existing empty directory', async () => {
    const dir = tempDir();
    await mkdir(dir, { recursive: true });
    await prepareProjectDir('test', dir);
    await expect(access(dir)).resolves.toBeUndefined();
    await rm(dir, { force: true, recursive: true });
  });

  test('should throw for non-empty directory without force', async () => {
    const dir = tempDir();
    await writeFixture(dir);
    await expect(prepareProjectDir('test', dir)).rejects.toThrow(
      'already exists'
    );
    await rm(dir, { force: true, recursive: true });
  });

  test('should overwrite non-empty directory with force', async () => {
    const dir = tempDir();
    await writeFixture(dir);
    await prepareProjectDir('test', dir, true);
    await expect(access(dir)).resolves.toBeUndefined();
    const files = await readdir(dir);
    expect(files.length).toBe(0);
    await rm(dir, { force: true, recursive: true });
  });
});

describe('scaffoldProject', () => {
  test('should modify package.json name', async () => {
    const dir = tempDir();
    await writeFixture(dir);

    const result = await scaffoldProject({
      cleanCI: false,
      initGit: false,
      packageManager: 'pnpm',
      projectName: 'my-project',
      projectPath: dir,
      skipDownload: true,
      template: TEMPLATES[0],
    });

    const content = await readFile(join(dir, 'package.json'), 'utf-8');
    const pkg = JSON.parse(content);
    expect(pkg.name).toBe('my-project');
    expect(result.projectName).toBe('my-project');
    expect(result.gitInitialized).toBe(false);
    expect(result.ciCleaned).toBe(false);
    await rm(dir, { force: true, recursive: true });
  });

  test('should clean CI configs when enabled', async () => {
    const dir = tempDir();
    await writeFixture(dir);
    await writeFile(join(dir, 'vercel.json'), JSON.stringify({}));

    const result = await scaffoldProject({
      cleanCI: true,
      initGit: false,
      packageManager: 'pnpm',
      projectName: 'test',
      projectPath: dir,
      skipDownload: true,
      template: TEMPLATES[0],
    });

    await expect(access(join(dir, 'vercel.json'))).rejects.toThrow();
    expect(result.ciCleaned).toBe(true);
    await rm(dir, { force: true, recursive: true });
  });

  test('should initialize git when enabled', async () => {
    const dir = tempDir();
    await writeFixture(dir);

    const result = await scaffoldProject({
      cleanCI: false,
      initGit: true,
      packageManager: 'pnpm',
      projectName: 'test',
      projectPath: dir,
      skipDownload: true,
      template: TEMPLATES[0],
    });

    expect(existsSync(join(dir, '.git'))).toBe(true);
    expect(result.gitInitialized).toBe(true);
    await rm(dir, { force: true, recursive: true });
  });

  test('should clean up created dir on failure', async () => {
    const dir = tempDir();
    const _pkgPath = join(dir, 'package.json');

    await expect(
      scaffoldProject({
        cleanCI: false,
        initGit: false,
        packageManager: 'pnpm',
        projectName: 'fail',
        projectPath: dir,
        skipDownload: true,
        template: TEMPLATES[0],
      })
    ).rejects.toThrow();

    expect(existsSync(dir)).toBe(false);
  });

  test('should not clean up pre-existing dir on failure', async () => {
    const dir = tempDir();
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'keep-me.txt'), 'data');

    await expect(
      scaffoldProject({
        cleanCI: false,
        initGit: false,
        packageManager: 'pnpm',
        projectName: 'exist',
        projectPath: dir,
        skipDownload: true,
        template: TEMPLATES[0],
      })
    ).rejects.toThrow();

    expect(existsSync(dir)).toBe(true);
    await rm(dir, { force: true, recursive: true });
  });

  test('should handle full scaffold end-to-end', async () => {
    const dir = tempDir();
    await writeFixture(dir);
    const ciDir = join(dir, '.github', 'workflows');
    await mkdir(ciDir, { recursive: true });
    await writeFile(join(ciDir, 'ci.yml'), 'name: CI');

    const result = await scaffoldProject({
      cleanCI: true,
      initGit: true,
      packageManager: 'pnpm',
      projectName: 'full-test',
      projectPath: dir,
      skipDownload: true,
      template: TEMPLATES[0],
    });

    const pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf-8'));
    expect(pkg.name).toBe('full-test');
    expect(existsSync(join(dir, '.git'))).toBe(true);
    expect(existsSync(join(dir, '.github'))).toBe(false);
    expect(result.projectName).toBe('full-test');
    expect(result.gitInitialized).toBe(true);
    expect(result.ciCleaned).toBe(true);
    expect(result.template.id).toBe(TEMPLATES[0].id);
    expect(result.packageManager).toBe('pnpm');
    await rm(dir, { force: true, recursive: true });
  }, 30_000);
});
