import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectProject } from '@xtarterize/core';
import { packageScriptsTask, plopTask } from '@xtarterize/tasks';
import { describe, expect } from 'vite-plus/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.resolve(__dirname, '../fixtures');

describe('plopTask', () => {
  test('is applicable to all projects', async () => {
    const profile = await detectProject(
      path.join(fixtures, 'react-vite-tailwind')
    );
    expect(plopTask.applicable(profile)).toBe(true);
  });

  test('returns new on clean fixture', async () => {
    const profile = await detectProject(
      path.join(fixtures, 'react-vite-tailwind')
    );
    const status = await plopTask.check(
      path.join(fixtures, 'react-vite-tailwind'),
      profile
    );
    expect(status).toBe('new');
  });

  test('renders generators with prompts and actions', async () => {
    const profile = await detectProject(
      path.join(fixtures, 'react-vite-tailwind')
    );
    const diffs = await plopTask.dryRun(
      path.join(fixtures, 'react-vite-tailwind'),
      profile
    );

    expect(diffs[0].after).toContain("plop.setGenerator('component'");
    expect(diffs[0].after).toContain('prompts: [namePrompt]');
    expect(diffs[0].after).toContain('actions: [');
    expect(diffs[0].after).not.toContain('prompts: []');
    expect(diffs[0].after).not.toContain('actions: []');
  });

  test('uses vp scripts when Vite+ detected and no existing biome', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-viteplus-nobiome-')
    );
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        devDependencies: {
          typescript: '^5.3.0',
          'vite-plus': '^0.1.0',
        },
        name: 'viteplus-nobiome',
        type: 'module',
      })
    );

    const profile = await detectProject(tmpDir);
    const diffs = await packageScriptsTask.dryRun(tmpDir, profile);
    const pkgDiff = diffs.find((d) => d.filepath === 'package.json');

    expect(pkgDiff?.after).toContain('"lint": "vp lint"');
    expect(pkgDiff?.after).toContain('"check": "vp check"');
    expect(pkgDiff?.after).toContain('"fix": "vp check --fix"');
    expect(pkgDiff?.after).not.toContain('"biome"');
    expect(pkgDiff?.after).not.toContain('"biome:fix"');

    await fs.rm(tmpDir, { recursive: true });
  });

  test('keeps biome scripts when Vite+ detected but biome dep already present', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-viteplus-biome-')
    );
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        devDependencies: {
          '@biomejs/biome': '^2.4.0',
          typescript: '^5.3.0',
          'vite-plus': '^0.1.0',
        },
        name: 'viteplus-biome',
        type: 'module',
      })
    );

    const profile = await detectProject(tmpDir);
    const diffs = await packageScriptsTask.dryRun(tmpDir, profile);
    const pkgDiff = diffs.find((d) => d.filepath === 'package.json');

    expect(pkgDiff?.after).toContain('"biome": "biome check ."');
    expect(pkgDiff?.after).toContain('"biome:fix": "biome check --write ."');
    expect(pkgDiff?.after).not.toContain('"lint": "vp lint"');

    await fs.rm(tmpDir, { recursive: true });
  });

  test('skips lint scripts when ESLint is already set up', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-eslint-')
    );
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        devDependencies: {
          eslint: '^8.56.0',
          typescript: '^5.3.0',
        },
        name: 'eslint-project',
        scripts: {
          lint: 'eslint .',
        },
        type: 'module',
      })
    );

    const profile = await detectProject(tmpDir);
    const diffs = await packageScriptsTask.dryRun(tmpDir, profile);
    const pkgDiff = diffs.find((d) => d.filepath === 'package.json');

    expect(pkgDiff?.after).not.toContain('"biome"');
    expect(pkgDiff?.after).not.toContain('"lint": "vp lint"');
    expect(pkgDiff?.after).not.toContain('"check"');
    expect(pkgDiff?.after).not.toContain('"fix"');

    await fs.rm(tmpDir, { recursive: true });
  });

  test('uses direct oxlint scripts when oxlint config exists without Vite+', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-oxlint-standalone-')
    );
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        devDependencies: {
          typescript: '^5.3.0',
        },
        name: 'oxlint-standalone',
        type: 'module',
      })
    );
    await fs.writeFile(
      path.join(tmpDir, '.oxlintrc.json'),
      JSON.stringify({ rules: { 'no-console': 'error' } })
    );

    const profile = await detectProject(tmpDir);
    const diffs = await packageScriptsTask.dryRun(tmpDir, profile);
    const pkgDiff = diffs.find((d) => d.filepath === 'package.json');

    expect(pkgDiff?.after).toContain('"lint": "oxlint --import-plugin"');
    expect(pkgDiff?.after).toContain(
      '"check": "oxlint --import-plugin && oxfmt --check"'
    );
    expect(pkgDiff?.after).toContain(
      '"fix": "oxlint --fix --import-plugin && oxfmt"'
    );
    expect(pkgDiff?.after).not.toContain('"biome"');
    expect(pkgDiff?.after).not.toContain('"vp ');

    await fs.rm(tmpDir, { recursive: true });
  });
});
