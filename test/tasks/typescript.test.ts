import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectProject } from '@xtarterize/core';
import {
  gitignoreTsbuildinfoTask,
  incrementalTask,
  pathsTask,
  strictTask,
} from '@xtarterize/tasks';
import { describe, expect } from 'vite-plus/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.resolve(__dirname, '../fixtures');

describe('gitignoreTsbuildinfoTask', () => {
  test('is applicable to TS projects only', async () => {
    const tsProfile = await detectProject(
      path.join(fixtures, 'react-vite-tailwind')
    );
    expect(gitignoreTsbuildinfoTask.applicable(tsProfile)).toBe(true);

    const nonTsProfile = await detectProject(
      path.join(fixtures, 'monorepo-turbo')
    );
    expect(gitignoreTsbuildinfoTask.applicable(nonTsProfile)).toBe(false);
  });

  test('returns new when .gitignore is missing', async () => {
    const profile = await detectProject(
      path.join(fixtures, 'react-vite-tailwind')
    );
    const status = await gitignoreTsbuildinfoTask.check(
      path.join(fixtures, 'react-vite-tailwind'),
      profile
    );
    expect(status).toBe('new');
  });

  test('dryRun returns correct content', async () => {
    const profile = await detectProject(
      path.join(fixtures, 'react-vite-tailwind')
    );
    const diffs = await gitignoreTsbuildinfoTask.dryRun(
      path.join(fixtures, 'react-vite-tailwind'),
      profile
    );
    expect(diffs.length).toBe(1);
    expect(diffs[0].filepath).toBe('.gitignore');
    expect(diffs[0].before).toBeNull();
    expect(diffs[0].after).toContain('.tsbuildinfo');
  });
});

describe('incrementalTask', () => {
  test('is applicable to TS projects only', async () => {
    const tsProfile = await detectProject(
      path.join(fixtures, 'react-vite-tailwind')
    );
    expect(incrementalTask.applicable(tsProfile)).toBe(true);
  });

  test('returns patch when incremental is missing', async () => {
    const profile = await detectProject(
      path.join(fixtures, 'react-vite-tailwind')
    );
    const status = await incrementalTask.check(
      path.join(fixtures, 'react-vite-tailwind'),
      profile
    );
    expect(status).toBe('patch');
  });

  test('dryRun returns correct diff', async () => {
    const profile = await detectProject(
      path.join(fixtures, 'react-vite-tailwind')
    );
    const diffs = await incrementalTask.dryRun(
      path.join(fixtures, 'react-vite-tailwind'),
      profile
    );
    expect(diffs.length).toBe(1);
    expect(diffs[0].after).toContain('incremental');
  });
});

describe('strictTask', () => {
  test('is applicable to TS projects only', async () => {
    const tsProfile = await detectProject(
      path.join(fixtures, 'react-vite-tailwind')
    );
    expect(strictTask.applicable(tsProfile)).toBe(true);

    const nonTsProfile = await detectProject(
      path.join(fixtures, 'monorepo-turbo')
    );
    expect(strictTask.applicable(nonTsProfile)).toBe(false);
  });

  test('skips when strict is already enabled', async () => {
    const profile = await detectProject(
      path.join(fixtures, 'react-vite-tailwind')
    );
    const status = await strictTask.check(
      path.join(fixtures, 'react-vite-tailwind'),
      profile
    );
    expect(status).toBe('skip');
  });

  test('returns conflict when strict is explicitly false', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-strict-false-')
    );
    await fs.writeFile(
      path.join(tmpDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: { strict: false, target: 'ES2020' },
      })
    );
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        devDependencies: { typescript: '^5.3.0' },
        name: 'strict-false',
      })
    );

    const profile = await detectProject(tmpDir);
    const status = await strictTask.check(tmpDir, profile);
    expect(status).toBe('conflict');

    await fs.rm(tmpDir, { recursive: true });
  });

  test('returns patch when strict key is missing', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-strict-missing-')
    );
    await fs.writeFile(
      path.join(tmpDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: { target: 'ES2020' },
      })
    );
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        devDependencies: { typescript: '^5.3.0' },
        name: 'strict-missing',
      })
    );

    const profile = await detectProject(tmpDir);
    const status = await strictTask.check(tmpDir, profile);
    expect(status).toBe('patch');

    await fs.rm(tmpDir, { recursive: true });
  });

  test('writes all strict compiler options on apply', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-ts-apply-')
    );
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        devDependencies: { typescript: '^5.3.0' },
        name: 'apply-test',
      })
    );
    await fs.writeFile(
      path.join(tmpDir, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { target: 'ES2020' } })
    );
    const profile = await detectProject(tmpDir);
    await strictTask.apply(tmpDir, profile);
    const content = JSON.parse(
      await fs.readFile(path.join(tmpDir, 'tsconfig.json'), 'utf-8')
    );
    expect(content.compilerOptions.strict).toBe(true);
    expect(content.compilerOptions.noUnusedLocals).toBe(true);
    expect(content.compilerOptions.noUnusedParameters).toBe(true);
    expect(content.compilerOptions.verbatimModuleSyntax).toBe(true);
    await fs.rm(tmpDir, { force: true, recursive: true });
  });
});

describe('pathsTask', () => {
  test('is applicable to TS projects only', async () => {
    const tsProfile = await detectProject(
      path.join(fixtures, 'react-vite-tailwind')
    );
    expect(pathsTask.applicable(tsProfile)).toBe(true);

    const nonTsProfile = await detectProject(
      path.join(fixtures, 'monorepo-turbo')
    );
    expect(pathsTask.applicable(nonTsProfile)).toBe(false);
  });

  test('skips when Vite path aliases already exist', async () => {
    const profile = await detectProject(
      path.join(fixtures, 'react-vite-tailwind')
    );
    const status = await pathsTask.check(
      path.join(fixtures, 'react-vite-tailwind'),
      profile
    );
    expect(status).toBe('skip');
  });

  test('skips Next path aliases when already configured', async () => {
    const profile = await detectProject(path.join(fixtures, 'nextjs'));
    const status = await pathsTask.check(
      path.join(fixtures, 'nextjs'),
      profile
    );
    const diffs = await pathsTask.dryRun(
      path.join(fixtures, 'nextjs'),
      profile
    );

    expect(status).toBe('skip');
    expect(diffs).toHaveLength(0);
  });

  test('adds src path aliases for non-Next TypeScript projects', async () => {
    const profile = await detectProject(path.join(fixtures, 'node-only'));
    const status = await pathsTask.check(
      path.join(fixtures, 'node-only'),
      profile
    );
    const diffs = await pathsTask.dryRun(
      path.join(fixtures, 'node-only'),
      profile
    );

    expect(status).toBe('patch');
    expect(diffs[0].after).toContain('"baseUrl": "."');
    expect(diffs[0].after).toContain('"@/*"');
    expect(diffs[0].after).toContain('"./src/*"');
  });
});
