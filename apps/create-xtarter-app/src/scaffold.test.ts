import { existsSync } from 'node:fs';
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from 'vite-plus/test';

import {
  prepareProjectDir,
  resolveProjectPath,
  scaffoldProject,
} from '@/scaffold';
import { TEMPLATES } from '@/templates/registry';
import { installDependencies } from '@/utils/install';

vi.mock('@/utils/install', () => ({
  installDependencies: vi.fn(),
}));

beforeEach(() => {
  // Runners have no git identity, so commits would fail without this.
  vi.stubEnv('GIT_AUTHOR_NAME', 'Test User');
  vi.stubEnv('GIT_AUTHOR_EMAIL', 'test@test.com');
  vi.stubEnv('GIT_COMMITTER_NAME', 'Test User');
  vi.stubEnv('GIT_COMMITTER_EMAIL', 'test@test.com');
  vi.mocked(installDependencies).mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function tempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'cxa-scaffold-test-'));
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
  test('should accept a new directory path without creating it', async () => {
    const parent = await tempDir();
    const dir = join(parent, 'test');
    await prepareProjectDir('test', dir);
    expect(existsSync(dir)).toBe(false);
    await rm(parent, { force: true, recursive: true });
  });

  test('should accept existing empty directory', async () => {
    const dir = await tempDir();
    await mkdir(dir, { recursive: true });
    await prepareProjectDir('test', dir);
    await expect(access(dir)).resolves.toBeUndefined();
    await rm(dir, { force: true, recursive: true });
  });

  test('should throw for non-empty directory without force', async () => {
    const dir = await tempDir();
    await writeFixture(dir);
    await expect(prepareProjectDir('test', dir)).rejects.toThrow(
      'already exists'
    );
    await rm(dir, { force: true, recursive: true });
  });

  test('should remove non-empty directory with force', async () => {
    const dir = await tempDir();
    await writeFixture(dir);
    await prepareProjectDir('test', dir, true);
    expect(existsSync(dir)).toBe(false);
    await rm(dir, { force: true, recursive: true });
  });
});

describe('scaffoldProject', () => {
  test('should modify package.json name', async () => {
    const dir = await tempDir();
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
    expect(result.dependenciesInstalled).toBe(true);
    expect(installDependencies).toHaveBeenCalledWith({
      packageManager: 'pnpm',
      projectPath: dir,
    });
    await rm(dir, { force: true, recursive: true });
  });

  test('should clean CI configs when enabled', async () => {
    const dir = await tempDir();
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
    const dir = await tempDir();
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

  test('should report git failure without failing the scaffold', async () => {
    const dir = await tempDir();

    const result = await scaffoldProject({
      cleanCI: false,
      initGit: true,
      packageManager: 'pnpm',
      projectName: 'git-fail',
      projectPath: dir,
      skipDownload: true,
      template: TEMPLATES[0],
    });

    expect(result.gitInitialized).toBe(false);
    expect(result.dependenciesInstalled).toBe(true);
    expect(existsSync(join(dir, '.git'))).toBe(true);
    await rm(dir, { force: true, recursive: true });
  });

  test('should clean up created dir on failure', async () => {
    const parent = await tempDir();
    const dir = join(parent, 'project');
    try {
      vi.mocked(installDependencies).mockRejectedValueOnce(
        new Error('install failed')
      );
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
    } finally {
      await rm(parent, { force: true, recursive: true });
    }
  });

  test('should clean up a directory that prepareProjectDir accepted', async () => {
    const parent = await tempDir();
    const dir = join(parent, 'project');
    await prepareProjectDir('project', dir);
    vi.mocked(installDependencies).mockRejectedValueOnce(
      new Error('install failed')
    );
    try {
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
    } finally {
      await rm(parent, { force: true, recursive: true });
    }
  });

  test('should not clean up pre-existing dir on failure', async () => {
    const dir = await tempDir();
    vi.mocked(installDependencies).mockRejectedValueOnce(
      new Error('install failed')
    );
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
    const dir = await tempDir();
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
