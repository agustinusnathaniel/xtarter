import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { checkCommand } from '@xtarterize/app/commands/check.js';
import { listCommand } from '@xtarterize/app/commands/list.js';
import { queryCommand } from '@xtarterize/app/commands/query.js';
import { restoreCommand } from '@xtarterize/app/commands/restore.js';
import { undoCommand } from '@xtarterize/app/commands/undo.js';
import { backupFile, writeRunManifest } from '@xtarterize/core';
import { describe, expect } from 'vite-plus/test';

async function createMinimalProject(): Promise<string> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-json-'));
  await fs.mkdir(path.join(tmpDir, '.git'), { recursive: true });
  await fs.writeFile(
    path.join(tmpDir, 'package.json'),
    JSON.stringify({
      dependencies: { react: '^18.2.0' },
      devDependencies: { typescript: '^5.0.0', vite: '^5.0.0' },
      name: 'json-output-fixture',
      type: 'module',
      version: '1.0.0',
    })
  );
  return tmpDir;
}

async function captureJsonOutput(run: () => Promise<void>): Promise<unknown> {
  const logs: Array<string> = [];
  const originalLog = console.log;
  console.log = (...args: Array<unknown>) => {
    logs.push(args.map((arg) => String(arg)).join(' '));
  };

  try {
    await run();
  } finally {
    console.log = originalLog;
  }

  expect(logs.length).toBeGreaterThan(0);
  // The payload must be the FIRST thing on stdout - a leading blank line
  // or human text breaks the machine-readable contract for CI consumers.
  const payload = logs.find((line) => line.trim().startsWith('{'));
  expect(payload).toBe(logs[0]);
  return JSON.parse(payload ?? '');
}

describe('undo and restore json output', () => {
  test('undo command emits machine-readable payload', async () => {
    const cwd = await createMinimalProject();
    try {
      await fs.writeFile(
        path.join(cwd, 'vite.config.ts'),
        'export default {}\n'
      );
      await fs.mkdir(path.join(cwd, '.xtarterize', 'backups'), {
        recursive: true,
      });
      await backupFile(cwd, 'vite.config.ts');
      await fs.writeFile(
        path.join(cwd, 'vite.config.ts'),
        'export default { changed: true }\n'
      );
      await fs.writeFile(path.join(cwd, 'newfile.ts'), 'created by run\n');
      await writeRunManifest(cwd, ['vite.config.ts', 'newfile.ts']);

      const output = (await captureJsonOutput(async () => {
        await undoCommand.run?.({ args: { cwd, json: true } } as never);
      })) as {
        ok: boolean;
        restored: number;
        total: number;
        removed?: number;
      };

      expect(output.ok).toBe(true);
      expect(output.restored).toBe(2);
      expect(output.total).toBe(2);
      expect(output.removed).toBe(1);

      const restored = await fs.readFile(
        path.join(cwd, 'vite.config.ts'),
        'utf-8'
      );
      expect(restored).toBe('export default {}\n');
      await expect(fs.access(path.join(cwd, 'newfile.ts'))).rejects.toThrow();

      expect(process.exitCode ?? 0).toBe(0);
    } finally {
      process.exitCode = 0;
      await fs.rm(cwd, { force: true, recursive: true });
    }
  });

  test('undo command exits 1 when there is nothing to undo', async () => {
    const cwd = await createMinimalProject();
    try {
      const output = (await captureJsonOutput(async () => {
        await undoCommand.run?.({ args: { cwd, json: true } } as never);
      })) as { ok: boolean };

      expect(output.ok).toBe(false);
      expect(process.exitCode).toBe(1);
    } finally {
      process.exitCode = 0;
      await fs.rm(cwd, { force: true, recursive: true });
    }
  });

  test('restore command emits machine-readable payload', async () => {
    const cwd = await createMinimalProject();
    try {
      await fs.writeFile(
        path.join(cwd, 'vite.config.ts'),
        'export default {}\n'
      );
      await fs.mkdir(path.join(cwd, '.xtarterize', 'backups'), {
        recursive: true,
      });
      await backupFile(cwd, 'vite.config.ts');
      await fs.writeFile(
        path.join(cwd, 'vite.config.ts'),
        'export default { changed: true }\n'
      );

      const output = (await captureJsonOutput(async () => {
        await restoreCommand.run?.({
          args: { cwd, filepath: 'vite.config.ts', json: true },
        } as never);
      })) as {
        ok: boolean;
        filepath: string;
        restoredFrom: string;
        timestamp: string;
      };

      expect(output.ok).toBe(true);
      expect(output.filepath).toBe('vite.config.ts');
      expect(typeof output.restoredFrom).toBe('string');
      expect(typeof output.timestamp).toBe('string');

      const restored = await fs.readFile(
        path.join(cwd, 'vite.config.ts'),
        'utf-8'
      );
      expect(restored).toBe('export default {}\n');

      expect(process.exitCode ?? 0).toBe(0);
    } finally {
      process.exitCode = 0;
      await fs.rm(cwd, { force: true, recursive: true });
    }
  });

  test('restore command exits 1 when no backup exists', async () => {
    const cwd = await createMinimalProject();
    try {
      await fs.writeFile(
        path.join(cwd, 'vite.config.ts'),
        'export default {}\n'
      );

      const output = (await captureJsonOutput(async () => {
        await restoreCommand.run?.({
          args: { cwd, filepath: 'vite.config.ts', json: true },
        } as never);
      })) as { ok: boolean; filepath: string; error: string };

      expect(output.ok).toBe(false);
      expect(output.filepath).toBe('vite.config.ts');
      expect(output.error).toBe('No backups found');
      expect(process.exitCode).toBe(1);
    } finally {
      process.exitCode = 0;
      await fs.rm(cwd, { force: true, recursive: true });
    }
  });
});

describe('json flag declarations', () => {
  // These commands honor --json through resolveCliContext/resolveRuntimeFlags and
  // the docs advertise it, so the flag must be declared in their args definition
  // to stay visible in --help.
  test('check, list, and query declare the --json flag they honor', () => {
    for (const command of [checkCommand, listCommand, queryCommand]) {
      expect(command.args?.json).toMatchObject({ type: 'boolean' });
    }
  });
});
