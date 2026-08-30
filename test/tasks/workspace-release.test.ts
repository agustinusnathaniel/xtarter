import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectProject } from '@xtarterize/core';
import {
  getAllTasks,
  pnpmWorkspaceTask,
  versionrcTask,
} from '@xtarterize/tasks';
import { describe, expect } from 'vite-plus/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.resolve(__dirname, '../fixtures');

describe('pnpmWorkspaceTask', () => {
  test('is applicable to pnpm projects', async () => {
    const profile = await detectProject(path.join(fixtures, 'monorepo-turbo'));
    expect(pnpmWorkspaceTask.applicable(profile)).toBe(true);
  });

  test('is not applicable to npm projects', async () => {
    const profile = await detectProject(
      path.join(fixtures, 'react-vite-no-styling')
    );
    expect(pnpmWorkspaceTask.applicable(profile)).toBe(false);
  });

  test('skips when pnpm-workspace.yaml already exists', async () => {
    const profile = await detectProject(path.join(fixtures, 'monorepo-turbo'));
    const status = await pnpmWorkspaceTask.check(
      path.join(fixtures, 'monorepo-turbo'),
      profile
    );
    expect(status).toBe('skip');
  });

  test('returns new when pnpm-workspace.yaml is missing in a pnpm project', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-pnpm-new-')
    );
    try {
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ name: 'pnpm-new-test' })
      );
      // Write a pnpm lockfile so detection returns pnpm
      await fs.writeFile(path.join(tmpDir, 'pnpm-lock.yaml'), '');
      const profile = await detectProject(tmpDir);
      const status = await pnpmWorkspaceTask.check(tmpDir, profile);
      expect(status).toBe('new');
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('generates packages definition for monorepo pnpm project', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-pnpm-monorepo-')
    );
    try {
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ name: 'monorepo-test' })
      );
      await fs.writeFile(path.join(tmpDir, 'pnpm-lock.yaml'), '');
      // Create monorepo markers (packages/ + apps/ dirs) so detectProject returns monorepo: true
      await fs.mkdir(path.join(tmpDir, 'packages'), { recursive: true });
      await fs.mkdir(path.join(tmpDir, 'apps'), { recursive: true });
      const profile = await detectProject(tmpDir);
      const diffs = await pnpmWorkspaceTask.dryRun(tmpDir, profile);
      expect(diffs.length).toBe(1);
      expect(diffs[0].filepath).toBe('pnpm-workspace.yaml');
      expect(diffs[0].before).toBeNull();
      expect(diffs[0].after).toContain("'apps/*'");
      expect(diffs[0].after).toContain("'packages/*'");
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('generates no packages definition for single-package pnpm project', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-pnpm-single-')
    );
    try {
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ name: 'single-test' })
      );
      await fs.writeFile(path.join(tmpDir, 'pnpm-lock.yaml'), '');
      const profile = await detectProject(tmpDir);
      const diffs = await pnpmWorkspaceTask.dryRun(tmpDir, profile);
      expect(diffs.length).toBe(1);
      expect(diffs[0].filepath).toBe('pnpm-workspace.yaml');
      expect(diffs[0].before).toBeNull();
      expect(diffs[0].after).not.toContain("'apps/*'");
      expect(diffs[0].after).not.toContain("'packages/*'");
      expect(diffs[0].after.trim()).toBe('# pnpm workspace config');
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('apply writes packages definition for monorepo', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-pnpm-apply-monorepo-')
    );
    try {
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ name: 'apply-monorepo' })
      );
      await fs.writeFile(path.join(tmpDir, 'pnpm-lock.yaml'), '');
      await fs.mkdir(path.join(tmpDir, 'packages'), { recursive: true });
      await fs.mkdir(path.join(tmpDir, 'apps'), { recursive: true });
      const profile = await detectProject(tmpDir);
      await pnpmWorkspaceTask.apply(tmpDir, profile);
      const content = await fs.readFile(
        path.join(tmpDir, 'pnpm-workspace.yaml'),
        'utf-8'
      );
      expect(content).toContain("'apps/*'");
      expect(content).toContain("'packages/*'");
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('apply writes minimal content for single-package pnpm project', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-pnpm-apply-single-')
    );
    try {
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ name: 'apply-single' })
      );
      await fs.writeFile(path.join(tmpDir, 'pnpm-lock.yaml'), '');
      const profile = await detectProject(tmpDir);
      await pnpmWorkspaceTask.apply(tmpDir, profile);
      const content = await fs.readFile(
        path.join(tmpDir, 'pnpm-workspace.yaml'),
        'utf-8'
      );
      expect(content).not.toContain("'apps/*'");
      expect(content).not.toContain("'packages/*'");
      expect(content.trim()).toBe('# pnpm workspace config');
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });
});

describe('versionrcTask', () => {
  test('is applicable to all projects', async () => {
    const profile = await detectProject(
      path.join(fixtures, 'react-vite-tailwind')
    );
    expect(versionrcTask.applicable(profile)).toBe(true);
  });

  test('returns new when .versionrc.json is missing', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-vrc-check-')
    );
    try {
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ name: 'vrc-check-test' })
      );
      const profile = await detectProject(tmpDir);
      const status = await versionrcTask.check(tmpDir, profile);
      expect(status).toBe('new');
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('dryRun returns expected content', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-vrc-dryrun-')
    );
    try {
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ name: 'vrc-dryrun-test' })
      );
      const profile = await detectProject(tmpDir);
      const diffs = await versionrcTask.dryRun(tmpDir, profile);
      expect(diffs.length).toBe(1);
      expect(diffs[0].filepath).toBe('.versionrc.json');
      expect(diffs[0].before).toBeNull();
      expect(diffs[0].after).toContain('"bumpFiles"');
      expect(diffs[0].after).toContain('"feat"');
      expect(diffs[0].after).toContain('"fix"');
      expect(diffs[0].after).toContain('"refactor"');
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('apply writes the expected file', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-versionrc-')
    );
    try {
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ name: 'apply-test' })
      );
      const profile = await detectProject(tmpDir);
      await versionrcTask.apply(tmpDir, profile);
      const content = await fs.readFile(
        path.join(tmpDir, '.versionrc.json'),
        'utf-8'
      );
      const parsed = JSON.parse(content);
      expect(parsed.bumpFiles).toEqual(['package.json']);
      expect(parsed.types).toBeDefined();
      expect(parsed.types[0].type).toBe('feat');
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });
});

describe('task registration', () => {
  test('both tasks are registered in getAllTasks()', () => {
    const tasks = getAllTasks();
    const ids = tasks.map((t) => t.id);
    expect(ids).toContain('workspace/pnpm-workspace');
    expect(ids).toContain('release/versionrc');
  });

  test('pnpmWorkspaceTask is exported', () => {
    expect(pnpmWorkspaceTask).toBeDefined();
    expect(pnpmWorkspaceTask.id).toBe('workspace/pnpm-workspace');
  });

  test('versionrcTask is exported', () => {
    expect(versionrcTask).toBeDefined();
    expect(versionrcTask.id).toBe('release/versionrc');
  });
});
