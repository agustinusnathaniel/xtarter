import fs from 'node:fs/promises';
import path from 'node:path';
import { captureJson } from '@test/helpers/console.js';
import { type ProjectFileMap, withProject } from '@test/helpers/project.js';
import { checkCommand } from '@xtarterize/app/commands/check.js';
import { listCommand } from '@xtarterize/app/commands/list.js';
import { queryCommand } from '@xtarterize/app/commands/query.js';
import { restoreCommand } from '@xtarterize/app/commands/restore.js';
import { undoCommand } from '@xtarterize/app/commands/undo.js';
import { backupFile, listBackups, writeRunManifest } from '@xtarterize/core';
import { describe, expect } from 'vite-plus/test';

const MINIMAL_FILES: ProjectFileMap = {
  'package.json': {
    dependencies: { react: '^18.2.0' },
    devDependencies: { typescript: '^5.0.0', vite: '^5.0.0' },
    name: 'json-output-fixture',
    type: 'module',
    version: '1.0.0',
  },
};

describe('undo and restore json output', () => {
  test('undo command emits machine-readable payload', async () => {
    await withProject(MINIMAL_FILES, async ({ cwd }) => {
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

        const output = (await captureJson(async () => {
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
      }
    });
  });
});

describe('undo and restore json output', () => {
  test('undo command exits 1 when there is nothing to undo', async () => {
    await withProject(MINIMAL_FILES, async ({ cwd }) => {
      try {
        const output = (await captureJson(async () => {
          await undoCommand.run?.({ args: { cwd, json: true } } as never);
        })) as { ok: boolean };

        expect(output.ok).toBe(false);
        expect(process.exitCode).toBe(1);
      } finally {
        process.exitCode = 0;
      }
    });
  });
});

describe('undo and restore json output', () => {
  test('restore command emits machine-readable payload', async () => {
    await withProject(MINIMAL_FILES, async ({ cwd }) => {
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

        const output = (await captureJson(async () => {
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
      }
    });
  });
});

describe('undo and restore json output', () => {
  test('restore command exits 1 when no backup exists', async () => {
    await withProject(MINIMAL_FILES, async ({ cwd }) => {
      try {
        await fs.writeFile(
          path.join(cwd, 'vite.config.ts'),
          'export default {}\n'
        );

        const output = (await captureJson(async () => {
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
      }
    });
  });
});

describe('undo and restore json output', () => {
  test('restore command reports failure when indexed backup is missing', async () => {
    await withProject(MINIMAL_FILES, async ({ cwd }) => {
      try {
        await fs.writeFile(
          path.join(cwd, 'vite.config.ts'),
          'export default {}\n'
        );
        await fs.mkdir(path.join(cwd, '.xtarterize', 'backups'), {
          recursive: true,
        });
        await backupFile(cwd, 'vite.config.ts');
        const backup = (await listBackups(cwd, 'vite.config.ts'))[0];
        expect(backup).toBeDefined();
        await fs.unlink(backup.backupPath);
        await fs.writeFile(
          path.join(cwd, 'vite.config.ts'),
          'export default { changed: true }\n'
        );

        const output = (await captureJson(async () => {
          await restoreCommand.run?.({
            args: { cwd, filepath: 'vite.config.ts', json: true },
          } as never);
        })) as { error: string; ok: boolean };

        expect(output.ok).toBe(false);
        expect(typeof output.error).toBe('string');
        expect(process.exitCode).toBe(1);

        const destination = await fs.readFile(
          path.join(cwd, 'vite.config.ts'),
          'utf-8'
        );
        expect(destination).toBe('export default { changed: true }\n');
      } finally {
        process.exitCode = 0;
      }
    });
  });
});

describe('json flag declarations', () => {
  // These commands honor --json through the shared runtime context and
  // the docs advertise it, so the flag must be declared in their args definition
  // to stay visible in --help.
  test('check, list, and query declare the --json flag they honor', () => {
    for (const command of [checkCommand, listCommand, queryCommand]) {
      expect(command.args?.json).toMatchObject({ type: 'boolean' });
    }
  });
});
