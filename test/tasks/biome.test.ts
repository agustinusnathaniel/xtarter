import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectProject } from '@xtarterize/core';
import { biomeTask, oxfmtTask, oxlintTask } from '@xtarterize/tasks';
import { describe, expect } from 'vite-plus/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.resolve(__dirname, '../fixtures');

describe('biomeTask', () => {
  test('is applicable to project with biome dep', async () => {
    const profile = await detectProject(
      path.join(fixtures, 'react-vite-tailwind')
    );
    expect(biomeTask.applicable(profile)).toBe(true);
  });

  test('is not applicable when ESLint is detected', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-bio-eslint-')
    );
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        devDependencies: { eslint: '^8.56.0' },
        name: 'eslint-project',
        type: 'module',
      })
    );

    const profile = await detectProject(tmpDir);
    expect(biomeTask.applicable(profile)).toBe(false);
    await fs.rm(tmpDir, { recursive: true });
  });

  test('is not applicable when oxlint config exists', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-bio-oxlint-')
    );
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'oxlint-standalone', type: 'module' })
    );
    await fs.writeFile(
      path.join(tmpDir, '.oxlintrc.json'),
      JSON.stringify({ rules: { 'no-console': 'error' } })
    );

    const profile = await detectProject(tmpDir);
    expect(biomeTask.applicable(profile)).toBe(false);
    await fs.rm(tmpDir, { recursive: true });
  });

  test('is applicable to Vite+ project with existing biome dep', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-bio-vp-biome-')
    );
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        devDependencies: {
          '@biomejs/biome': '^2.4.0',
          'vite-plus': '^0.1.0',
        },
        name: 'vp-biome',
        type: 'module',
      })
    );
    await fs.writeFile(
      path.join(tmpDir, 'biome.json'),
      JSON.stringify({
        $schema: './node_modules/@biomejs/biome/configuration_schema.json',
      })
    );

    const profile = await detectProject(tmpDir);
    expect(biomeTask.applicable(profile)).toBe(true);
    await fs.rm(tmpDir, { recursive: true });
  });

  test('is not applicable to Vite+ project without biome dep', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-bio-vp-nobiome-')
    );
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        devDependencies: { 'vite-plus': '^0.1.0' },
        name: 'vp-only',
        type: 'module',
      })
    );

    const profile = await detectProject(tmpDir);
    expect(biomeTask.applicable(profile)).toBe(false);
    await fs.rm(tmpDir, { recursive: true });
  });

  test('returns new on clean fixture', async () => {
    const profile = await detectProject(
      path.join(fixtures, 'react-vite-tailwind')
    );
    const status = await biomeTask.check(
      path.join(fixtures, 'react-vite-tailwind'),
      profile
    );
    expect(status).toBe('new');
  });

  test('dryRun returns diffs', async () => {
    const profile = await detectProject(
      path.join(fixtures, 'react-vite-tailwind')
    );
    const diffs = await biomeTask.dryRun(
      path.join(fixtures, 'react-vite-tailwind'),
      profile
    );
    expect(diffs.length).toBeGreaterThan(0);
    expect(diffs[0].filepath).toBe('biome.json');
    expect(diffs[0].before).toBeNull();
  });

  test('includes css.tailwindDirectives for tailwind projects', async () => {
    const profile = await detectProject(
      path.join(fixtures, 'react-vite-tailwind')
    );
    const diffs = await biomeTask.dryRun(
      path.join(fixtures, 'react-vite-tailwind'),
      profile
    );
    const config = JSON.parse(diffs[0].after ?? '{}');
    expect(config.css?.parser?.tailwindDirectives).toBe(true);
  });

  test('excludes css.tailwindDirectives for non-tailwind projects', async () => {
    const profile = await detectProject(
      path.join(fixtures, 'react-vite-no-styling')
    );
    const diffs = await biomeTask.dryRun(
      path.join(fixtures, 'react-vite-no-styling'),
      profile
    );
    const config = JSON.parse(diffs[0].after ?? '{}');
    expect(config.css).toBeUndefined();
  });
});

describe('oxlintTask', () => {
  test('is applicable when Vite+ is detected', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-oxl-vp-')
    );
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        devDependencies: { 'vite-plus': '^0.1.0' },
        name: 'vp-project',
        type: 'module',
      })
    );

    const profile = await detectProject(tmpDir);
    expect(oxlintTask.applicable(profile)).toBe(true);
    await fs.rm(tmpDir, { recursive: true });
  });

  test('is not applicable when ESLint is detected', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-oxl-eslint-')
    );
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        devDependencies: { eslint: '^8.56.0' },
        name: 'eslint-project',
        type: 'module',
      })
    );

    const profile = await detectProject(tmpDir);
    expect(oxlintTask.applicable(profile)).toBe(false);
    await fs.rm(tmpDir, { recursive: true });
  });

  test('is not applicable when biome is already set up', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-oxl-biome-')
    );
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        devDependencies: { '@biomejs/biome': '^2.4.0' },
        name: 'biome-project',
        type: 'module',
      })
    );

    const profile = await detectProject(tmpDir);
    expect(oxlintTask.applicable(profile)).toBe(false);
    await fs.rm(tmpDir, { recursive: true });
  });

  test('returns config diff on dryRun for Vite+ project', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-oxl-dry-')
    );
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        devDependencies: { 'vite-plus': '^0.1.0' },
        name: 'vp-project',
        type: 'module',
      })
    );

    const profile = await detectProject(tmpDir);
    const diffs = await oxlintTask.dryRun(tmpDir, profile);

    expect(diffs.length).toBeGreaterThan(0);
    expect(diffs[0].filepath).toBe('oxlint.config.ts');
    expect(diffs[0].before).toBeNull();
    expect(diffs[0].after).toContain('no-console');
    await fs.rm(tmpDir, { recursive: true });
  });
});

describe('oxfmtTask', () => {
  test('returns config diff on dryRun for Vite+ project', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-oxfm-dry-')
    );
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        devDependencies: { 'vite-plus': '^0.1.0' },
        name: 'vp-project',
        type: 'module',
      })
    );

    const profile = await detectProject(tmpDir);
    const diffs = await oxfmtTask.dryRun(tmpDir, profile);

    expect(diffs.length).toBeGreaterThan(0);
    expect(diffs[0].filepath).toBe('oxfmt.config.ts');
    expect(diffs[0].before).toBeNull();
    expect(diffs[0].after).toContain('singleQuote');
    await fs.rm(tmpDir, { recursive: true });
  });
});
