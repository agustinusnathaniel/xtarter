import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { runConflictChecks, runEnvironmentChecks } from '@xtarterize/core';
import { describe, expect } from 'vite-plus/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createPkg(
  dir: string,
  content: Record<string, unknown>
): Promise<void> {
  return fs.writeFile(path.join(dir, 'package.json'), JSON.stringify(content));
}

/**
 * Build a temporary project with the given dependencies/devDependencies for
 * conflict-detection tests.  Returns the temp directory path.
 */
async function tmpProject(
  deps: Record<string, string> = {},
  devDeps: Record<string, string> = {}
): Promise<string> {
  const tmpDir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'xtarterize-conflict-')
  );
  await createPkg(tmpDir, {
    dependencies: deps,
    devDependencies: devDeps,
    name: 'test',
    version: '1.0.0',
  });
  return tmpDir;
}

describe('runEnvironmentChecks with engine edge cases', () => {
  const currentMajor = Number.parseInt(
    process.version.slice(1).split('.')[0],
    10
  );

  test('handles missing engines.node without error', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-diag-'));
    await createPkg(tmpDir, { name: 'test', version: '1.0.0' });
    try {
      const checks = await runEnvironmentChecks(tmpDir);
      const nodeCheck = checks.find((c) => c.name === 'Node.js');
      expect(nodeCheck).toBeDefined();
      // no engine constraint → always pass
      expect(nodeCheck?.status).toBe('pass');
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('correctly handles ">=16 <20" range', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-diag-'));
    await createPkg(tmpDir, {
      engines: { node: '>=16 <20' },
      name: 'test',
      version: '1.0.0',
    });
    try {
      const checks = await runEnvironmentChecks(tmpDir);
      const nodeCheck = checks.find((c) => c.name === 'Node.js');
      expect(nodeCheck).toBeDefined();
      // engineMajor should be 16 (first numeric segment), not NaN
      expect(nodeCheck?.status).toBe(currentMajor >= 16 ? 'pass' : 'warn');
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('handles "^20.0.0-rc" prerelease range', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-diag-'));
    await createPkg(tmpDir, {
      engines: { node: '^20.0.0-rc' },
      name: 'test',
      version: '1.0.0',
    });
    try {
      const checks = await runEnvironmentChecks(tmpDir);
      const nodeCheck = checks.find((c) => c.name === 'Node.js');
      expect(nodeCheck).toBeDefined();
      // engineMajor should be 20 (not NaN from "-rc")
      expect(nodeCheck?.status).toBe(currentMajor >= 20 ? 'pass' : 'warn');
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });
});

describe('runConflictChecks edge cases', () => {
  test('warns when both Biome and ESLint are present', async () => {
    const tmpDir = await tmpProject(
      {},
      { '@biomejs/biome': '^1.0.0', eslint: '^8.0.0' }
    );
    try {
      const checks = await runConflictChecks(tmpDir);
      const biomeslint = checks.filter((c) =>
        c.message.includes('Biome and ESLint')
      );
      expect(biomeslint).toHaveLength(1);
      expect(biomeslint[0].status).toBe('warn');
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('warns when both Biome and Prettier are present', async () => {
    const tmpDir = await tmpProject(
      {},
      { '@biomejs/biome': '^1.0.0', prettier: '^3.0.0' }
    );
    try {
      const checks = await runConflictChecks(tmpDir);
      const biomePret = checks.filter((c) =>
        c.message.includes('Biome and Prettier')
      );
      expect(biomePret).toHaveLength(1);
      expect(biomePret[0].status).toBe('warn');
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('passes when only Biome is present (no conflict)', async () => {
    const tmpDir = await tmpProject({}, { '@biomejs/biome': '^1.0.0' });
    try {
      const checks = await runConflictChecks(tmpDir);
      const passCheck = checks.find((c) => c.status === 'pass');
      expect(passCheck).toBeDefined();
      expect(checks.filter((c) => c.status === 'warn')).toHaveLength(0);
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('passes when none of Biome, ESLint, Prettier are present', async () => {
    const tmpDir = await tmpProject({}, { typescript: '^5.0.0' });
    try {
      const checks = await runConflictChecks(tmpDir);
      const passCheck = checks.find((c) => c.status === 'pass');
      expect(passCheck).toBeDefined();
      expect(checks.filter((c) => c.status === 'warn')).toHaveLength(0);
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('produces 2 warnings when Biome + ESLint + Prettier are all present', async () => {
    const tmpDir = await tmpProject(
      {},
      {
        '@biomejs/biome': '^1.0.0',
        eslint: '^8.0.0',
        prettier: '^3.0.0',
      }
    );
    try {
      const checks = await runConflictChecks(tmpDir);
      const warnings = checks.filter((c) => c.status === 'warn');
      expect(warnings).toHaveLength(2);
      expect(warnings.some((c) => c.message.includes('Biome and ESLint'))).toBe(
        true
      );
      expect(
        warnings.some((c) => c.message.includes('Biome and Prettier'))
      ).toBe(true);
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });
});
