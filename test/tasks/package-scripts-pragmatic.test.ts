import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectProject } from '@xtarterize/core';
import { packageScriptsTask } from '@xtarterize/tasks';
import { describe, expect } from 'vite-plus/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const _fixtures = path.resolve(__dirname, '../fixtures');

describe('packageScriptsTask', () => {
  describe('edge cases', () => {
    describe('all managed scripts use pragmatic approach', () => {
      test('skips biome:fix when existing has check with biome', async () => {
        const tmpDir = await fs.mkdtemp(
          path.join(os.tmpdir(), 'xtarterize-biome-fix-')
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
            name: 'biome-fix-skip',
            scripts: {
              biome: 'biome check .',
              check: 'biome check --write .',
            },
            type: 'module',
          })
        );

        const profile = await detectProject(tmpDir);
        const status = await packageScriptsTask.check(tmpDir, profile);
        const diffs = await packageScriptsTask.dryRun(tmpDir, profile);
        const pkgDiff = diffs.find((d) => d.filepath === 'package.json');

        expect(status).toBe('patch');
        expect(pkgDiff?.after).not.toContain('"biome:fix"');
        expect(pkgDiff?.after).toContain('"biome"');
        expect(pkgDiff?.after).toContain('"test"');
        expect(pkgDiff?.after).toContain('"check:turbo"');

        await fs.rm(tmpDir, { recursive: true });
      });

      test('skips test when existing has vitest', async () => {
        const tmpDir = await fs.mkdtemp(
          path.join(os.tmpdir(), 'xtarterize-test-skip-')
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
            name: 'test-skip',
            scripts: {
              test: 'vitest run --coverage',
            },
            type: 'module',
          })
        );

        const profile = await detectProject(tmpDir);
        const status = await packageScriptsTask.check(tmpDir, profile);
        const diffs = await packageScriptsTask.dryRun(tmpDir, profile);
        const pkgDiff = diffs.find((d) => d.filepath === 'package.json');

        expect(status).toBe('patch');
        expect(pkgDiff?.after).toContain('"test"');
        expect(pkgDiff?.after).toContain('"biome"');
        expect(pkgDiff?.after).toContain('"typecheck"');
        expect(pkgDiff?.after).toContain('"check:turbo"');
        expect(pkgDiff?.after).toContain('turbo run biome typecheck test');

        await fs.rm(tmpDir, { recursive: true });
      });

      test('skips release when existing has standard-version', async () => {
        const tmpDir = await fs.mkdtemp(
          path.join(os.tmpdir(), 'xtarterize-release-skip-')
        );
        await fs.writeFile(
          path.join(tmpDir, 'package.json'),
          JSON.stringify({
            devDependencies: {
              '@biomejs/biome': '^1.0.0',
              'standard-version': '^9.0.0',
              turbo: '^2.0.0',
              typescript: '^5.3.0',
              vitest: '^1.0.0',
            },
            name: 'release-skip',
            scripts: {
              release: 'standard-version',
            },
            type: 'module',
          })
        );

        const profile = await detectProject(tmpDir);
        const status = await packageScriptsTask.check(tmpDir, profile);
        const diffs = await packageScriptsTask.dryRun(tmpDir, profile);
        const pkgDiff = diffs.find((d) => d.filepath === 'package.json');

        expect(status).toBe('patch');
        expect(pkgDiff?.after).toContain('"release"');
        expect(pkgDiff?.after).toContain('"biome"');
        expect(pkgDiff?.after).toContain('"typecheck"');
        expect(pkgDiff?.after).toContain('"test"');

        await fs.rm(tmpDir, { recursive: true });
      });

      test('skips plop when existing has hygen', async () => {
        const tmpDir = await fs.mkdtemp(
          path.join(os.tmpdir(), 'xtarterize-plop-skip-')
        );
        await fs.writeFile(
          path.join(tmpDir, 'package.json'),
          JSON.stringify({
            devDependencies: {
              '@biomejs/biome': '^1.0.0',
              hygen: '^6.0.0',
              turbo: '^2.0.0',
              typescript: '^5.3.0',
              vitest: '^1.0.0',
            },
            name: 'plop-skip',
            scripts: {
              generate: 'hygen',
            },
            type: 'module',
          })
        );

        const profile = await detectProject(tmpDir);
        const status = await packageScriptsTask.check(tmpDir, profile);
        const diffs = await packageScriptsTask.dryRun(tmpDir, profile);
        const pkgDiff = diffs.find((d) => d.filepath === 'package.json');

        expect(status).toBe('patch');
        expect(pkgDiff?.after).not.toContain('"plop"');
        expect(pkgDiff?.after).toContain('"biome"');
        expect(pkgDiff?.after).toContain('"typecheck"');
        expect(pkgDiff?.after).toContain('"test"');

        await fs.rm(tmpDir, { recursive: true });
      });

      test('skips knip when existing has depcheck', async () => {
        const tmpDir = await fs.mkdtemp(
          path.join(os.tmpdir(), 'xtarterize-knip-skip-')
        );
        await fs.writeFile(
          path.join(tmpDir, 'package.json'),
          JSON.stringify({
            devDependencies: {
              '@biomejs/biome': '^1.0.0',
              depcheck: '^1.0.0',
              turbo: '^2.0.0',
              typescript: '^5.3.0',
              vitest: '^1.0.0',
            },
            name: 'knip-skip',
            scripts: {
              knip: 'depcheck',
            },
            type: 'module',
          })
        );

        const profile = await detectProject(tmpDir);
        const status = await packageScriptsTask.check(tmpDir, profile);
        const diffs = await packageScriptsTask.dryRun(tmpDir, profile);
        const pkgDiff = diffs.find((d) => d.filepath === 'package.json');

        expect(status).toBe('patch');
        expect(pkgDiff?.after).toContain('"knip"');
        expect(pkgDiff?.after).toContain('"biome"');
        expect(pkgDiff?.after).toContain('"typecheck"');
        expect(pkgDiff?.after).toContain('"test"');

        await fs.rm(tmpDir, { recursive: true });
      });

      test('skips upgrade when existing has npm-check-updates', async () => {
        const tmpDir = await fs.mkdtemp(
          path.join(os.tmpdir(), 'xtarterize-upgrade-skip-')
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
            name: 'upgrade-skip',
            scripts: {
              upgrade: 'npx npm-check-updates -u',
            },
            type: 'module',
          })
        );

        const profile = await detectProject(tmpDir);
        const status = await packageScriptsTask.check(tmpDir, profile);
        const diffs = await packageScriptsTask.dryRun(tmpDir, profile);
        const pkgDiff = diffs.find((d) => d.filepath === 'package.json');

        expect(status).toBe('patch');
        expect(pkgDiff?.after).toContain('"upgrade"');
        expect(pkgDiff?.after).toContain('"biome"');
        expect(pkgDiff?.after).toContain('"typecheck"');
        expect(pkgDiff?.after).toContain('"test"');

        await fs.rm(tmpDir, { recursive: true });
      });

      test('skips typecheck when existing has tsc with different args', async () => {
        const tmpDir = await fs.mkdtemp(
          path.join(os.tmpdir(), 'xtarterize-typecheck-skip-')
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
            name: 'typecheck-skip',
            scripts: {
              typecheck: 'tsc --noEmit --build',
            },
            type: 'module',
          })
        );

        const profile = await detectProject(tmpDir);
        const status = await packageScriptsTask.check(tmpDir, profile);
        const diffs = await packageScriptsTask.dryRun(tmpDir, profile);
        const pkgDiff = diffs.find((d) => d.filepath === 'package.json');

        expect(status).toBe('patch');
        expect(pkgDiff?.after).toContain('"typecheck"');
        expect(pkgDiff?.after).toContain('"biome"');
        expect(pkgDiff?.after).toContain('"test"');
        expect(pkgDiff?.after).toContain('"check:turbo"');
        expect(pkgDiff?.after).toContain('turbo run biome typecheck test');

        await fs.rm(tmpDir, { recursive: true });
      });

      test('adds all missing scripts when none exist', async () => {
        const tmpDir = await fs.mkdtemp(
          path.join(os.tmpdir(), 'xtarterize-all-missing-')
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
            name: 'all-missing',
            scripts: {},
            type: 'module',
          })
        );

        const profile = await detectProject(tmpDir);
        const diffs = await packageScriptsTask.dryRun(tmpDir, profile);
        const pkgDiff = diffs.find((d) => d.filepath === 'package.json');

        expect(pkgDiff?.after).toContain('"biome"');
        expect(pkgDiff?.after).toContain('"biome:fix"');
        expect(pkgDiff?.after).toContain('"test"');
        expect(pkgDiff?.after).toContain('"typecheck"');
        expect(pkgDiff?.after).toContain('"knip"');
        expect(pkgDiff?.after).toContain('"upgrade"');
        expect(pkgDiff?.after).toContain('"release"');
        expect(pkgDiff?.after).toContain('"plop"');
        expect(pkgDiff?.after).toContain('"check:turbo"');

        await fs.rm(tmpDir, { recursive: true });
      });
    });
  });
});
