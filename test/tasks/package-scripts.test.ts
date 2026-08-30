import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectProject } from '@xtarterize/core';
import { packageScriptsTask } from '@xtarterize/tasks';
import { describe, expect } from 'vite-plus/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.resolve(__dirname, '../fixtures');

describe('packageScriptsTask', () => {
  test('is applicable to all projects', async () => {
    const profile = await detectProject(
      path.join(fixtures, 'react-vite-tailwind')
    );
    expect(packageScriptsTask.applicable(profile)).toBe(true);
  });

  test('returns patch when project has existing scripts', async () => {
    const profile = await detectProject(
      path.join(fixtures, 'react-vite-tailwind')
    );
    const status = await packageScriptsTask.check(
      path.join(fixtures, 'react-vite-tailwind'),
      profile
    );
    expect(status).toBe('patch');
  });

  test('dryRun includes package.json diff', async () => {
    const profile = await detectProject(
      path.join(fixtures, 'react-vite-tailwind')
    );
    const diffs = await packageScriptsTask.dryRun(
      path.join(fixtures, 'react-vite-tailwind'),
      profile
    );
    const pkgDiff = diffs.find((d) => d.filepath === 'package.json');
    expect(pkgDiff).toBeDefined();
    expect(pkgDiff?.after).toContain('biome');
    expect(pkgDiff?.after).toContain('biome:fix');
    expect(pkgDiff?.after).toContain('test');
    expect(pkgDiff?.after).toContain('typecheck');
    expect(pkgDiff?.after).toContain('upgrade');
    expect(pkgDiff?.after).toContain('release');
    expect(pkgDiff?.after).toContain('knip');
    expect(pkgDiff?.after).toContain('plop');
    expect(pkgDiff?.after).not.toContain('ultracite');
  });

  test('preserves existing scripts and only adds missing ones', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-script-conflict-')
    );
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify(
        {
          dependencies: {
            next: '^14.1.0',
            react: '^18.2.0',
            'react-dom': '^18.2.0',
          },
          devDependencies: {
            typescript: '^5.3.0',
          },
          name: 'script-conflict',
          scripts: {
            biome: 'eslint .',
          },
          type: 'module',
        },
        null,
        2
      )
    );

    const profile = await detectProject(tmpDir);
    const status = await packageScriptsTask.check(tmpDir, profile);
    const diffs = await packageScriptsTask.dryRun(tmpDir, profile);
    const pkgDiff = diffs.find((d) => d.filepath === 'package.json');

    expect(status).toBe('patch');
    expect(pkgDiff?.after).toContain('"biome": "eslint ."');
    expect(pkgDiff?.after).toContain('"biome:fix": "biome check --write ."');
  });

  test('skips scripts whose value already exists under a different key', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-script-dedup-')
    );
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify(
        {
          devDependencies: {
            typescript: '^5.3.0',
          },
          name: 'script-dedup',
          scripts: {
            dev: 'next dev',
            'type:check': 'tsc --noEmit',
          },
          type: 'module',
        },
        null,
        2
      )
    );

    const profile = await detectProject(tmpDir);
    const status = await packageScriptsTask.check(tmpDir, profile);
    const diffs = await packageScriptsTask.dryRun(tmpDir, profile);
    const pkgDiff = diffs.find((d) => d.filepath === 'package.json');

    expect(status).toBe('patch');
    expect(pkgDiff?.after).not.toContain('"typecheck"');
    expect(pkgDiff?.after).toContain('"test"');
  });

  test('does not add typecheck or knip for non-TS projects', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-no-ts-')
    );
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        name: 'no-ts-project',
        type: 'module',
      })
    );

    const profile = await detectProject(tmpDir);
    const diffs = await packageScriptsTask.dryRun(tmpDir, profile);
    const pkgDiff = diffs.find((d) => d.filepath === 'package.json');

    expect(pkgDiff?.after).not.toContain('"typecheck"');
    expect(pkgDiff?.after).not.toContain('"knip"');
    expect(pkgDiff?.after).toContain('"biome"');
    expect(pkgDiff?.after).toContain('"release"');

    await fs.rm(tmpDir, { recursive: true });
  });

  test('does not overwrite existing matching scripts', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-existing-')
    );
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        devDependencies: {
          '@biomejs/biome': '^1.0.0',
          'commit-and-tag-version': '^12.0.0',
          knip: '^5.0.0',
          plop: '^4.0.0',
          typescript: '^5.3.0',
          vitest: '^3.0.0',
        },
        name: 'existing-scripts',
        scripts: {
          biome: 'biome check .',
          'biome:fix': 'biome check --write .',
          knip: 'knip',
          plop: 'plop',
          release: 'commit-and-tag-version',
          test: 'vitest run',
          typecheck: 'tsc --noEmit',
          upgrade: 'pnpm up -i -L',
        },
        type: 'module',
      })
    );

    const profile = await detectProject(tmpDir);
    const status = await packageScriptsTask.check(tmpDir, profile);
    expect(status).toBe('skip');

    await fs.rm(tmpDir, { recursive: true });
  });

  test('uses ultracite scripts when Ultracite is installed', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-ultracite-')
    );
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify(
        {
          devDependencies: {
            typescript: '^5.3.0',
            ultracite: '^1.0.0',
          },
          name: 'ultracite-project',
          type: 'module',
        },
        null,
        2
      )
    );

    const profile = await detectProject(tmpDir);
    const diffs = await packageScriptsTask.dryRun(tmpDir, profile);
    const pkgDiff = diffs.find((d) => d.filepath === 'package.json');

    expect(pkgDiff?.after).toContain('"ultracite:check": "ultracite check"');
    expect(pkgDiff?.after).toContain('"ultracite:fix": "ultracite fix"');
    expect(pkgDiff?.after).not.toContain('"lint"');
    expect(pkgDiff?.after).not.toContain('"format"');
    expect(pkgDiff?.after).not.toContain('biome');
    expect(pkgDiff?.after).toContain('"typecheck"');
    expect(pkgDiff?.after).toContain('"release"');
  });

  test('skips biome when existing lint uses biome', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-biome-equivalence-')
    );
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        devDependencies: {
          '@biomejs/biome': '^1.0.0',
        },
        name: 'biome-equivalence',
        scripts: {
          lint: 'biome check .',
        },
        type: 'module',
      })
    );

    const profile = await detectProject(tmpDir);
    const status = await packageScriptsTask.check(tmpDir, profile);
    const diffs = await packageScriptsTask.dryRun(tmpDir, profile);
    const pkgDiff = diffs.find((d) => d.filepath === 'package.json');

    expect(status).toBe('patch');
    expect(pkgDiff?.after).not.toContain('"biome"');
    expect(pkgDiff?.after).toContain('"test"');

    await fs.rm(tmpDir, { recursive: true });
  });

  test('skips upgrade when existing up-latest uses same tool', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-upgrade-equivalence-')
    );
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        name: 'upgrade-equivalence',
        scripts: {
          'up-latest': 'pnpm up -i -L',
        },
        type: 'module',
      })
    );
    // Create lockfile so PM detection returns pnpm
    await fs.writeFile(path.join(tmpDir, 'pnpm-lock.yaml'), '');

    const profile = await detectProject(tmpDir);
    const status = await packageScriptsTask.check(tmpDir, profile);
    const diffs = await packageScriptsTask.dryRun(tmpDir, profile);
    const pkgDiff = diffs.find((d) => d.filepath === 'package.json');

    expect(status).toBe('patch');
    expect(pkgDiff?.after).not.toContain('"upgrade"');
    expect(pkgDiff?.after).toContain('"biome"');

    await fs.rm(tmpDir, { recursive: true });
  });

  test('skips when same script via different PM reference', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-pm-script-ref-')
    );
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        name: 'pm-script-ref',
        scripts: {
          dev: 'next dev',
          'npm:build': 'turbo run build',
        },
        type: 'module',
      })
    );

    const profile = await detectProject(tmpDir);
    const status = await packageScriptsTask.check(tmpDir, profile);
    const diffs = await packageScriptsTask.dryRun(tmpDir, profile);
    const pkgDiff = diffs.find((d) => d.filepath === 'package.json');

    expect(status).toBe('patch');
    expect(pkgDiff?.after).not.toContain('"build"');

    await fs.rm(tmpDir, { recursive: true });
  });

  test('does not add lint scripts when ESLint is detected', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-eslint-nolint-')
    );
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        devDependencies: {
          eslint: '^8.0.0',
        },
        name: 'eslint-only',
        scripts: {
          lint: 'eslint .',
        },
        type: 'module',
      })
    );

    const profile = await detectProject(tmpDir);
    const status = await packageScriptsTask.check(tmpDir, profile);
    const diffs = await packageScriptsTask.dryRun(tmpDir, profile);
    const pkgDiff = diffs.find((d) => d.filepath === 'package.json');

    expect(status).toBe('patch');
    expect(pkgDiff?.after).not.toContain('"biome"');
    expect(pkgDiff?.after).not.toContain('"biome:fix"');
    expect(pkgDiff?.after).not.toContain('"lint": "vp');
    expect(pkgDiff?.after).not.toContain('"check"');
    expect(pkgDiff?.after).not.toContain('"fix"');

    await fs.rm(tmpDir, { recursive: true });
  });

  test('does not skip same tool with different arguments', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-diff-args-')
    );
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        devDependencies: {
          '@biomejs/biome': '^1.0.0',
        },
        name: 'diff-args',
        scripts: {
          'biome:check': 'biome check src/',
        },
        type: 'module',
      })
    );

    const profile = await detectProject(tmpDir);
    const status = await packageScriptsTask.check(tmpDir, profile);
    const diffs = await packageScriptsTask.dryRun(tmpDir, profile);
    const pkgDiff = diffs.find((d) => d.filepath === 'package.json');

    expect(status).toBe('patch');
    expect(pkgDiff?.after).toContain('"biome"');

    await fs.rm(tmpDir, { recursive: true });
  });

  test('keeps check:turbo when existing has same tasks but adds other scripts', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-turbo-same-')
    );
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        devDependencies: {
          turbo: '^2.0.0',
          typescript: '^5.3.0',
        },
        name: 'turbo-same',
        scripts: {
          'check:turbo': 'turbo run biome typecheck test',
        },
        type: 'module',
      })
    );

    const profile = await detectProject(tmpDir);
    const status = await packageScriptsTask.check(tmpDir, profile);
    const diffs = await packageScriptsTask.dryRun(tmpDir, profile);
    const pkgDiff = diffs.find((d) => d.filepath === 'package.json');

    expect(status).toBe('patch');
    expect(pkgDiff?.after).toContain('"check:turbo"');

    await fs.rm(tmpDir, { recursive: true });
  });

  test('adds missing scripts when check:turbo exists with different tasks', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-turbo-diff-')
    );
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        devDependencies: {
          turbo: '^2.0.0',
          typescript: '^5.3.0',
        },
        name: 'turbo-diff',
        scripts: {
          'check:turbo': 'turbo run lint build',
        },
        type: 'module',
      })
    );

    const profile = await detectProject(tmpDir);
    const status = await packageScriptsTask.check(tmpDir, profile);
    const diffs = await packageScriptsTask.dryRun(tmpDir, profile);
    const pkgDiff = diffs.find((d) => d.filepath === 'package.json');

    expect(status).toBe('patch');
    expect(pkgDiff?.after).toContain('"biome"');

    await fs.rm(tmpDir, { recursive: true });
  });

  test('uses existing script keys in check:turbo when available', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-turbo-refs-existing-')
    );
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        devDependencies: {
          '@biomejs/biome': '^1.0.0',
          turbo: '^2.0.0',
          typescript: '^5.3.0',
          vitest: '^1.0.0',
        },
        name: 'turbo-refs-existing',
        scripts: {
          lint: 'biome check .',
          test: 'vitest run',
          typecheck: 'tsc --noEmit',
        },
        type: 'module',
      })
    );

    const profile = await detectProject(tmpDir);
    const diffs = await packageScriptsTask.dryRun(tmpDir, profile);
    const pkgDiff = diffs.find((d) => d.filepath === 'package.json');

    expect(pkgDiff?.after).toContain('"check:turbo"');
    expect(pkgDiff?.after).toContain('turbo run lint typecheck test');

    await fs.rm(tmpDir, { recursive: true });
  });

  test('only adds missing scripts and builds check:turbo from all refs', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-turbo-partial-')
    );
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        devDependencies: {
          '@biomejs/biome': '^1.0.0',
          turbo: '^2.0.0',
          typescript: '^5.3.0',
          vitest: '^1.0.0',
        },
        name: 'turbo-partial',
        scripts: {
          lint: 'biome check .',
          test: 'vitest run',
        },
        type: 'module',
      })
    );

    const profile = await detectProject(tmpDir);
    const diffs = await packageScriptsTask.dryRun(tmpDir, profile);
    const pkgDiff = diffs.find((d) => d.filepath === 'package.json');

    expect(pkgDiff?.after).toContain('"typecheck"');
    expect(pkgDiff?.after).toContain('"check:turbo"');
    expect(pkgDiff?.after).toContain('turbo run lint typecheck test');

    await fs.rm(tmpDir, { recursive: true });
  });

  test('does not duplicate existing biome when lint exists with biome', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-no-dup-biome-')
    );
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        devDependencies: {
          '@biomejs/biome': '^1.0.0',
          turbo: '^2.0.0',
          typescript: '^5.3.0',
          vitest: '^1.0.0',
        },
        name: 'no-dup-biome',
        scripts: {
          lint: 'biome check .',
        },
        type: 'module',
      })
    );

    const profile = await detectProject(tmpDir);
    const status = await packageScriptsTask.check(tmpDir, profile);
    const diffs = await packageScriptsTask.dryRun(tmpDir, profile);
    const pkgDiff = diffs.find((d) => d.filepath === 'package.json');

    expect(status).toBe('patch');
    expect(pkgDiff?.after).not.toContain('"biome"');
    expect(pkgDiff?.after).toContain('"typecheck"');
    expect(pkgDiff?.after).toContain('"test"');
    expect(pkgDiff?.after).toContain('"check:turbo"');
    expect(pkgDiff?.after).toContain('turbo run lint typecheck test');

    await fs.rm(tmpDir, { recursive: true });
  });
});
