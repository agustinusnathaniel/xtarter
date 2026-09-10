import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect } from 'vite-plus/test';

import {
  applyPackageJsonChange,
  computePackageJsonChange,
} from '../../packages/tasks/src/factory/package-json.js';

const withTempDir = async (
  run: (cwd: string) => Promise<void>
): Promise<void> => {
  const tmpDir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'xtarterize-package-json-')
  );
  try {
    await run(tmpDir);
  } finally {
    await fs.rm(tmpDir, { force: true, recursive: true });
  }
};

const packageJsonPath = (cwd: string): string => path.join(cwd, 'package.json');

const readPackageJson = (cwd: string): Promise<string> =>
  fs.readFile(packageJsonPath(cwd), 'utf-8');

const writePackageJson = (cwd: string, content: string): Promise<void> =>
  fs.writeFile(packageJsonPath(cwd), content);

describe('package.json owner', () => {
  test('computed change equals the bytes written by apply', async () => {
    await withTempDir(async (cwd) => {
      await writePackageJson(
        cwd,
        `${JSON.stringify({ name: 'example' }, null, 2)}\n`
      );
      const patch = { scripts: { test: 'vitest run' } };

      const change = await computePackageJsonChange(cwd, patch);
      expect(change).not.toBeNull();

      const applied = await applyPackageJsonChange(cwd, patch);
      expect(applied).toEqual(change);
      await expect(readPackageJson(cwd)).resolves.toBe(change?.after);
    });
  });

  test('comments and indentation survive a change', async () => {
    await withTempDir(async (cwd) => {
      const original = [
        '{',
        '    // keep this comment',
        '    "name": "example",',
        '    "devDependencies": {',
        '        "left-pad": "^1.0.0"',
        '    }',
        '}',
        '',
      ].join('\n');
      await writePackageJson(cwd, original);

      const change = await computePackageJsonChange(cwd, {
        scripts: { test: 'vitest run' },
      });

      expect(change).not.toBeNull();
      expect(change?.after).toContain('// keep this comment');
      expect(change?.after).toContain('\n    "name": "example"');
      expect(change?.after).toContain('\n        "left-pad": "^1.0.0"');
      expect(change?.after).toContain('\n    "scripts": {');
      expect(change?.after).toContain('\n        "test": "vitest run"');
    });
  });

  test('applying an already-present change returns null and writes nothing', async () => {
    await withTempDir(async (cwd) => {
      await writePackageJson(
        cwd,
        `${JSON.stringify({ name: 'example' }, null, 2)}\n`
      );
      const patch = { scripts: { test: 'vitest run' } };

      const first = await applyPackageJsonChange(cwd, patch);
      expect(first).not.toBeNull();
      const afterFirst = await readPackageJson(cwd);

      const second = await applyPackageJsonChange(cwd, patch);
      expect(second).toBeNull();
      await expect(readPackageJson(cwd)).resolves.toBe(afterFirst);
    });
  });

  test('an external write between compute and apply survives', async () => {
    await withTempDir(async (cwd) => {
      await writePackageJson(
        cwd,
        `${JSON.stringify({ devDependencies: {}, name: 'example' }, null, 2)}\n`
      );
      const patch = { scripts: { test: 'vitest run' } };
      const computed = await computePackageJsonChange(cwd, patch);
      expect(computed).not.toBeNull();

      const external = JSON.parse(await readPackageJson(cwd)) as {
        devDependencies: Record<string, string>;
      };
      external.devDependencies['new-dep'] = '^1.0.0';
      await writePackageJson(cwd, `${JSON.stringify(external, null, 2)}\n`);

      const applied = await applyPackageJsonChange(cwd, patch);
      expect(applied).not.toBeNull();

      const written = await readPackageJson(cwd);
      expect(written).toContain('"new-dep": "^1.0.0"');
      expect(written).toContain('"test": "vitest run"');
      expect(written).toBe(applied?.after);
    });
  });
});
