import fs from 'node:fs/promises';
import path from 'node:path';
import { ProcessError, runDiagnostics } from '@xtarterize/core';
import { Effect } from 'effect';
import { describe, expect } from 'vite-plus/test';

import { processRunnerLayer, runWith } from '../helpers/run.js';
import { withTempDir } from '../helpers/temp.js';

type DiagnosticGroupId = 'configuration' | 'environment' | 'project' | 'tools';

/**
 * Stub ProcessRunner: Git reports an installed version, so environment checks
 * do not depend on host binaries. Unknown commands act like missing binaries.
 */
const processRunner = processRunnerLayer((command) =>
  command === 'git'
    ? Effect.succeed({
        exitCode: 0,
        stderr: '',
        stdout: 'git version 2.43.0',
      })
    : Effect.fail(
        new ProcessError({ message: `Command "${command}" not found` })
      )
);

async function checksFor(cwd: string, group: DiagnosticGroupId) {
  const { groups } = await runWith(
    processRunner,
    runDiagnostics(cwd, { groups: [group] })
  );
  return groups.flatMap((entry) => entry.checks);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createPkg(
  dir: string,
  content: Record<string, unknown>
): Promise<void> {
  return fs.writeFile(path.join(dir, 'package.json'), JSON.stringify(content));
}

/** Build the package.json used by conflict-detection tests. */
function createConflictPkg(
  dir: string,
  deps: Record<string, string> = {},
  devDeps: Record<string, string> = {}
): Promise<void> {
  return createPkg(dir, {
    dependencies: deps,
    devDependencies: devDeps,
    name: 'test',
    version: '1.0.0',
  });
}

describe('runDiagnostics environment group with engine edge cases', () => {
  const currentMajor = Number.parseInt(
    process.version.slice(1).split('.')[0],
    10
  );

  test('handles missing engines.node without error', async () => {
    await withTempDir('xtarterize-diag-', async (tmpDir) => {
      await createPkg(tmpDir, { name: 'test', version: '1.0.0' });
      const checks = await checksFor(tmpDir, 'environment');
      const nodeCheck = checks.find((c) => c.name === 'Node.js');
      expect(nodeCheck).toBeDefined();
      // no engine constraint → always pass
      expect(nodeCheck?.status).toBe('pass');
    });
  });

  test('correctly handles ">=16 <20" range', async () => {
    await withTempDir('xtarterize-diag-', async (tmpDir) => {
      await createPkg(tmpDir, {
        engines: { node: '>=16 <20' },
        name: 'test',
        version: '1.0.0',
      });
      const checks = await checksFor(tmpDir, 'environment');
      const nodeCheck = checks.find((c) => c.name === 'Node.js');
      expect(nodeCheck).toBeDefined();
      // engineMajor should be 16 (first numeric segment), not NaN
      expect(nodeCheck?.status).toBe(currentMajor >= 16 ? 'pass' : 'warn');
    });
  });

  test('handles "^20.0.0-rc" prerelease range', async () => {
    await withTempDir('xtarterize-diag-', async (tmpDir) => {
      await createPkg(tmpDir, {
        engines: { node: '^20.0.0-rc' },
        name: 'test',
        version: '1.0.0',
      });
      const checks = await checksFor(tmpDir, 'environment');
      const nodeCheck = checks.find((c) => c.name === 'Node.js');
      expect(nodeCheck).toBeDefined();
      // engineMajor should be 20 (not NaN from "-rc")
      expect(nodeCheck?.status).toBe(currentMajor >= 20 ? 'pass' : 'warn');
    });
  });
});

describe('runDiagnostics configuration group edge cases', () => {
  test('warns when both Biome and ESLint are present', async () => {
    await withTempDir('xtarterize-conflict-', async (tmpDir) => {
      await createConflictPkg(
        tmpDir,
        {},
        {
          '@biomejs/biome': '^1.0.0',
          eslint: '^8.0.0',
        }
      );
      const checks = await checksFor(tmpDir, 'configuration');
      const biomeslint = checks.filter((c) =>
        c.message.includes('Biome and ESLint')
      );
      expect(biomeslint).toHaveLength(1);
      expect(biomeslint[0].status).toBe('warn');
    });
  });

  test('warns when both Biome and Prettier are present', async () => {
    await withTempDir('xtarterize-conflict-', async (tmpDir) => {
      await createConflictPkg(
        tmpDir,
        {},
        {
          '@biomejs/biome': '^1.0.0',
          prettier: '^3.0.0',
        }
      );
      const checks = await checksFor(tmpDir, 'configuration');
      const biomePret = checks.filter((c) =>
        c.message.includes('Biome and Prettier')
      );
      expect(biomePret).toHaveLength(1);
      expect(biomePret[0].status).toBe('warn');
    });
  });

  test('passes when only Biome is present (no conflict)', async () => {
    await withTempDir('xtarterize-conflict-', async (tmpDir) => {
      await createConflictPkg(tmpDir, {}, { '@biomejs/biome': '^1.0.0' });
      const checks = await checksFor(tmpDir, 'configuration');
      const passCheck = checks.find((c) => c.status === 'pass');
      expect(passCheck).toBeDefined();
      expect(checks.filter((c) => c.status === 'warn')).toHaveLength(0);
    });
  });

  test('passes when none of Biome, ESLint, Prettier are present', async () => {
    await withTempDir('xtarterize-conflict-', async (tmpDir) => {
      await createConflictPkg(tmpDir, {}, { typescript: '^5.0.0' });
      const checks = await checksFor(tmpDir, 'configuration');
      const passCheck = checks.find((c) => c.status === 'pass');
      expect(passCheck).toBeDefined();
      expect(checks.filter((c) => c.status === 'warn')).toHaveLength(0);
    });
  });

  test('produces 2 warnings when Biome + ESLint + Prettier are all present', async () => {
    await withTempDir('xtarterize-conflict-', async (tmpDir) => {
      await createConflictPkg(
        tmpDir,
        {},
        {
          '@biomejs/biome': '^1.0.0',
          eslint: '^8.0.0',
          prettier: '^3.0.0',
        }
      );
      const checks = await checksFor(tmpDir, 'configuration');
      const warnings = checks.filter((c) => c.status === 'warn');
      expect(warnings).toHaveLength(2);
      expect(warnings.some((c) => c.message.includes('Biome and ESLint'))).toBe(
        true
      );
      expect(
        warnings.some((c) => c.message.includes('Biome and Prettier'))
      ).toBe(true);
    });
  });
});
