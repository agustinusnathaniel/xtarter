import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectProject } from '@xtarterize/core';
import { gitHooksTask } from '@xtarterize/tasks';
import { describe, expect } from 'vite-plus/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.resolve(__dirname, '../fixtures');

describe('gitHooksTask', () => {
  test('applies to any project', () => {
    expect(gitHooksTask.applicable({} as never)).toBe(true);
  });

  test('returns new on clean fixture', async () => {
    const profile = await detectProject(
      path.join(fixtures, 'react-vite-tailwind')
    );
    const status = await gitHooksTask.check(
      path.join(fixtures, 'react-vite-tailwind'),
      profile
    );
    expect(status).toBe('new');
  });

  test('creates .husky files in dryRun for non-vite+ projects', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'));
    try {
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ name: 'hooks-test', scripts: {} })
      );
      const profile = await detectProject(tmpDir);
      const diffs = await gitHooksTask.dryRun(tmpDir, profile);
      const filepaths = diffs.map((d) => d.filepath);
      expect(filepaths).toContain('.husky/commit-msg');
      expect(filepaths).toContain('.husky/prepare-commit-msg');
      expect(filepaths).toContain('.husky/pre-commit');
      expect(filepaths).toContain('.husky/pre-push');
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('uses turbo pre-push for turbo monorepos', async () => {
    const profile = await detectProject(path.join(fixtures, 'monorepo-turbo'));
    const diffs = await gitHooksTask.dryRun(
      path.join(fixtures, 'monorepo-turbo'),
      profile
    );
    const prePush = diffs.find((d) => d.filepath.includes('pre-push'));
    expect(prePush?.after).toContain('pnpm run check:turbo');
  });

  test('returns patch when hooks exist but prepare script is missing', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'));
    try {
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({
          devDependencies: { husky: '^9.0.0' },
          name: 'hooks-test',
          scripts: {},
        })
      );
      await fs.mkdir(path.join(tmpDir, '.husky'), { recursive: true });
      await fs.writeFile(path.join(tmpDir, '.husky/commit-msg'), 'content');
      await fs.writeFile(
        path.join(tmpDir, '.husky/prepare-commit-msg'),
        'content'
      );
      await fs.writeFile(path.join(tmpDir, '.husky/pre-commit'), 'content');
      await fs.writeFile(path.join(tmpDir, '.husky/pre-push'), 'content');
      const profile = await detectProject(tmpDir);
      const status = await gitHooksTask.check(tmpDir, profile);
      expect(status).toBe('patch');
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('returns patch when hooks exist but dep is missing', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'));
    try {
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ name: 'hooks-test', scripts: {} })
      );
      await fs.mkdir(path.join(tmpDir, '.husky'), { recursive: true });
      await fs.writeFile(path.join(tmpDir, '.husky/commit-msg'), 'content');
      await fs.writeFile(
        path.join(tmpDir, '.husky/prepare-commit-msg'),
        'content'
      );
      await fs.writeFile(path.join(tmpDir, '.husky/pre-commit'), 'content');
      await fs.writeFile(path.join(tmpDir, '.husky/pre-push'), 'content');
      const profile = await detectProject(tmpDir);
      const status = await gitHooksTask.check(tmpDir, profile);
      expect(status).toBe('patch');
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('prepare-commit-msg is no-op when czg is absent', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'));
    try {
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ name: 'hooks-test', scripts: {} })
      );
      const profile = await detectProject(tmpDir);
      const diffs = await gitHooksTask.dryRun(tmpDir, profile);
      const prepareCommitMsg = diffs.find((d) =>
        d.filepath.includes('prepare-commit-msg')
      );
      expect(prepareCommitMsg?.after).toContain('exit 0');
      expect(prepareCommitMsg?.after).not.toContain('cz');
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('prepare-commit-msg runs cz when czg is installed', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'));
    try {
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({
          devDependencies: { czg: '^1.0.0' },
          name: 'hooks-test',
          scripts: {},
        })
      );
      const profile = await detectProject(tmpDir);
      const diffs = await gitHooksTask.dryRun(tmpDir, profile);
      const prepareCommitMsg = diffs.find((d) =>
        d.filepath.includes('prepare-commit-msg')
      );
      expect(prepareCommitMsg?.after).toContain('cz');
      expect(prepareCommitMsg?.after).toContain('--hook');
      expect(prepareCommitMsg?.after).toContain('exec < /dev/tty');
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('prepare-commit-msg runs cz when commitizen is installed', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'));
    try {
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({
          devDependencies: { commitizen: '^4.0.0' },
          name: 'hooks-test',
          scripts: {},
        })
      );
      const profile = await detectProject(tmpDir);
      const diffs = await gitHooksTask.dryRun(tmpDir, profile);
      const prepareCommitMsg = diffs.find((d) =>
        d.filepath.includes('prepare-commit-msg')
      );
      expect(prepareCommitMsg?.after).toContain('cz');
      expect(prepareCommitMsg?.after).toContain('--hook');
      expect(prepareCommitMsg?.after).toContain('exec < /dev/tty');
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });
});
