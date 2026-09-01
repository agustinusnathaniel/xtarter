import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { detectProject } from '@xtarterize/core';
import { packageScriptsTask } from '@xtarterize/tasks';
import { describe, expect } from 'vite-plus/test';

describe('packageScriptsTask', () => {
  describe('edge cases', () => {
    test('handles empty scripts object', async () => {
      const tmpDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'xtarterize-empty-scripts-')
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
          name: 'empty-scripts',
          scripts: {},
          type: 'module',
        })
      );

      const profile = await detectProject(tmpDir);
      const status = await packageScriptsTask.check(tmpDir, profile);
      const diffs = await packageScriptsTask.dryRun(tmpDir, profile);
      const pkgDiff = diffs.find((d) => d.filepath === 'package.json');

      expect(status).toBe('new');
      expect(pkgDiff?.after).toContain('"biome"');
      expect(pkgDiff?.after).toContain('"typecheck"');
      expect(pkgDiff?.after).toContain('"test"');
      expect(pkgDiff?.after).toContain('"check:turbo"');

      await fs.rm(tmpDir, { recursive: true });
    });

    test('handles script with empty value', async () => {
      const tmpDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'xtarterize-empty-value-')
      );
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({
          devDependencies: {
            turbo: '^2.0.0',
            typescript: '^5.3.0',
          },
          name: 'empty-value',
          scripts: {
            build: 'turbo run build',
            lint: '',
          },
          type: 'module',
        })
      );

      const profile = await detectProject(tmpDir);
      const diffs = await packageScriptsTask.dryRun(tmpDir, profile);
      const pkgDiff = diffs.find((d) => d.filepath === 'package.json');

      expect(pkgDiff?.after).toContain('"biome"');
      expect(pkgDiff?.after).toContain('"test"');

      await fs.rm(tmpDir, { recursive: true });
    });

    test('skips all lint scripts when existing eslint uses biome', async () => {
      const tmpDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'xtarterize-eslint-biome-')
      );
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({
          devDependencies: {
            eslint: '^8.0.0',
            turbo: '^2.0.0',
            typescript: '^5.3.0',
            vitest: '^1.0.0',
          },
          name: 'eslint-biome',
          scripts: {
            lint: 'eslint . --fix',
          },
          type: 'module',
        })
      );

      const profile = await detectProject(tmpDir);
      const diffs = await packageScriptsTask.dryRun(tmpDir, profile);
      const pkgDiff = diffs.find((d) => d.filepath === 'package.json');

      expect(pkgDiff?.after).not.toContain('"biome"');
      expect(pkgDiff?.after).toContain('"check:turbo"');

      await fs.rm(tmpDir, { recursive: true });
    });

    test('does not skip biome when existing lint has different args', async () => {
      const tmpDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'xtarterize-diff-args-')
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
          name: 'diff-args',
          scripts: {
            lint: 'biome check src/',
          },
          type: 'module',
        })
      );

      const profile = await detectProject(tmpDir);
      const diffs = await packageScriptsTask.dryRun(tmpDir, profile);
      const pkgDiff = diffs.find((d) => d.filepath === 'package.json');

      expect(pkgDiff?.after).toContain('"biome"');
      expect(pkgDiff?.after).toContain('"typecheck"');
      expect(pkgDiff?.after).toContain('"test"');

      await fs.rm(tmpDir, { recursive: true });
    });

    test('handles namespaced script references separately', async () => {
      const tmpDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'xtarterize-pm-ref-')
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
          name: 'pm-ref',
          scripts: {
            'npm:build': 'turbo run build',
            'pnpm:dev': 'turbo run dev',
            typecheck: 'tsc --noEmit',
          },
          type: 'module',
        })
      );

      const profile = await detectProject(tmpDir);
      const diffs = await packageScriptsTask.dryRun(tmpDir, profile);
      const pkgDiff = diffs.find((d) => d.filepath === 'package.json');

      expect(pkgDiff?.after).toContain('"typecheck"');
      expect(pkgDiff?.after).toContain('"biome"');
      expect(pkgDiff?.after).toContain('"test"');
      expect(pkgDiff?.after).toContain('"check:turbo"');

      await fs.rm(tmpDir, { recursive: true });
    });

    test('non-TS project does not add typecheck or knip', async () => {
      const tmpDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'xtarterize-non-ts-')
      );
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({
          devDependencies: {
            '@biomejs/biome': '^1.0.0',
            turbo: '^2.0.0',
          },
          name: 'non-ts',
          scripts: {
            lint: 'biome check .',
          },
          type: 'module',
        })
      );

      const profile = await detectProject(tmpDir);
      const diffs = await packageScriptsTask.dryRun(tmpDir, profile);
      const pkgDiff = diffs.find((d) => d.filepath === 'package.json');

      expect(pkgDiff?.after).not.toContain('"typecheck"');
      expect(pkgDiff?.after).not.toContain('"knip"');
      expect(pkgDiff?.after).toContain('"test"');
      expect(pkgDiff?.after).toContain('"check:turbo"');
      expect(pkgDiff?.after).toContain('turbo run lint test');

      await fs.rm(tmpDir, { recursive: true });
    });

    test('non-turbo monorepo does not add check:turbo', async () => {
      const tmpDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'xtarterize-no-turbo-')
      );
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({
          devDependencies: {
            typescript: '^5.3.0',
          },
          name: 'no-turbo',
          scripts: {},
          type: 'module',
        })
      );

      const profile = await detectProject(tmpDir);
      const diffs = await packageScriptsTask.dryRun(tmpDir, profile);
      const pkgDiff = diffs.find((d) => d.filepath === 'package.json');

      expect(pkgDiff?.after).not.toContain('check:turbo');
      expect(pkgDiff?.after).toContain('"biome"');
      expect(pkgDiff?.after).toContain('"typecheck"');

      await fs.rm(tmpDir, { recursive: true });
    });

    test('adds upgrade script even with npx npm-check-updates', async () => {
      const tmpDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'xtarterize-upgrade-dup-')
      );
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({
          devDependencies: {},
          name: 'upgrade-dup',
          scripts: {
            upgrade: 'npx npm-check-updates -i',
          },
          type: 'module',
        })
      );

      const profile = await detectProject(tmpDir);
      const diffs = await packageScriptsTask.dryRun(tmpDir, profile);
      const pkgDiff = diffs.find((d) => d.filepath === 'package.json');

      expect(pkgDiff?.after).toContain('"upgrade"');

      await fs.rm(tmpDir, { recursive: true });
    });

    test('adds upgrade when existing is different', async () => {
      const tmpDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'xtarterize-upgrade-diff-')
      );
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({
          devDependencies: {},
          name: 'upgrade-diff',
          scripts: {
            upgrade: 'npm outdated',
          },
          type: 'module',
        })
      );

      const profile = await detectProject(tmpDir);
      const diffs = await packageScriptsTask.dryRun(tmpDir, profile);
      const pkgDiff = diffs.find((d) => d.filepath === 'package.json');

      expect(pkgDiff?.after).toContain('"upgrade"');

      await fs.rm(tmpDir, { recursive: true });
    });

    test('check:turbo uses only existing keys when all exist', async () => {
      const tmpDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'xtarterize-turbo-all-exist-')
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
          name: 'turbo-all-exist',
          scripts: {
            check: 'biome check --write .',
            lint: 'biome check .',
            test: 'vitest run',
            typecheck: 'tsc --noEmit',
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
      expect(pkgDiff?.after).toContain('turbo run check typecheck test');
      expect(pkgDiff?.after).not.toContain('"biome"');

      await fs.rm(tmpDir, { recursive: true });
    });

    test('check:turbo mixes existing and new tasks correctly', async () => {
      const tmpDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'xtarterize-turbo-mix-')
      );
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({
          devDependencies: {
            '@biomejs/biome': '^1.0.0',
            turbo: '^2.0.0',
            typescript: '^5.3.0',
          },
          name: 'turbo-mix',
          scripts: {
            fmt: 'biome check --write .',
          },
          type: 'module',
        })
      );

      const profile = await detectProject(tmpDir);
      const diffs = await packageScriptsTask.dryRun(tmpDir, profile);
      const pkgDiff = diffs.find((d) => d.filepath === 'package.json');

      expect(pkgDiff?.after).toContain('"typecheck"');
      expect(pkgDiff?.after).toContain('"test"');
      expect(pkgDiff?.after).toContain('"check:turbo"');

      await fs.rm(tmpDir, { recursive: true });
    });

    test('handles script with trailing spaces', async () => {
      const tmpDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'xtarterize-trailing-spaces-')
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
          name: 'trailing-spaces',
          scripts: {
            biome: 'biome check .   ',
          },
          type: 'module',
        })
      );

      const profile = await detectProject(tmpDir);
      const diffs = await packageScriptsTask.dryRun(tmpDir, profile);
      const pkgDiff = diffs.find((d) => d.filepath === 'package.json');

      expect(pkgDiff?.after).toContain('"biome":');

      await fs.rm(tmpDir, { recursive: true });
    });

    test('respects existing check:turbo with same tasks', async () => {
      const tmpDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'xtarterize-check-turbo-same-')
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
          name: 'check-turbo-same',
          scripts: {
            biome: 'biome check .',
            'check:turbo': 'turbo run biome typecheck test',
            test: 'vitest run',
            typecheck: 'tsc --noEmit',
          },
          type: 'module',
        })
      );

      const profile = await detectProject(tmpDir);
      const status = await packageScriptsTask.check(tmpDir, profile);
      const diffs = await packageScriptsTask.dryRun(tmpDir, profile);
      const pkgDiff = diffs.find((d) => d.filepath === 'package.json');

      expect(status).toBe('patch');
      expect(pkgDiff?.after).toContain('check:turbo');

      await fs.rm(tmpDir, { recursive: true });
    });

    test('overwrites existing check:turbo with different tasks', async () => {
      const tmpDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'xtarterize-check-turbo-diff-')
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
          name: 'check-turbo-diff',
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
      expect(pkgDiff?.after).toContain('"check:turbo"');
      expect(pkgDiff?.after).toContain('"biome"');

      await fs.rm(tmpDir, { recursive: true });
    });
  });
});
