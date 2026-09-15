import fs from 'node:fs/promises';
import path from 'node:path';
import { addCommand, addProgram } from '@xtarterize/app/commands/add/index.js';
import { initCommand, initProgram } from '@xtarterize/app/commands/init.js';
import { restoreCommand } from '@xtarterize/app/commands/restore.js';
import { syncCommand } from '@xtarterize/app/commands/sync.js';
import { undoCommand } from '@xtarterize/app/commands/undo.js';
import { Prompter } from '@xtarterize/app/ui/prompter.js';
import {
  backupFile,
  readRunManifest,
  writeRunManifest,
} from '@xtarterize/core';
import { Effect, Layer } from 'effect';
import { describe, expect, vi } from 'vite-plus/test';

import { captureConsole } from '../helpers/console.js';
import { type ProjectFileMap, withProject } from '../helpers/project.js';
import {
  recordingDepsInstaller,
  recordingProcessRunner,
  runWith,
} from '../helpers/run.js';

const { mockGetAllTasks } = vi.hoisted(() => ({
  mockGetAllTasks: vi.fn(),
}));

// Module-global mock: spread the real tasks module and default getAllTasks to
// the real one so un-mocked tests are unaffected. Individual tests override
// with mockImplementationOnce.
vi.mock('@xtarterize/tasks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@xtarterize/tasks')>();
  mockGetAllTasks.mockImplementation(actual.getAllTasks);
  return { ...actual, getAllTasks: mockGetAllTasks };
});

const MINIMAL_FILES: ProjectFileMap = {
  'package.json': {
    dependencies: { react: '^18.2.0' },
    devDependencies: { typescript: '^5.0.0', vite: '^5.0.0' },
    name: 'cmd-test-fixture',
    type: 'module',
    version: '1.0.0',
  },
};

const OUTDATED_LINT_FILES: ProjectFileMap = {
  'biome.json': JSON.stringify({
    $schema: './node_modules/@biomejs/biome/configuration_schema.json',
    formatter: { enabled: false },
    linter: { enabled: true, rules: { recommended: true } },
  }),
  'tsconfig.json': '{"compilerOptions":{"strict":false}}\n',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('sync command', () => {
  test('exits cleanly on unchanged project', async () => {
    await withProject(MINIMAL_FILES, async ({ cwd, readJson }) => {
      process.exitCode = 0;
      try {
        await fs.writeFile(
          path.join(cwd, '.gitignore'),
          '*.tsbuildinfo\n.tsbuildinfo/\n'
        );
        await fs.writeFile(
          path.join(cwd, '.lintstagedrc.json'),
          JSON.stringify({
            '*.{js,jsx,ts,tsx,mjs,mts,cjs,cts}': ['biome check --write'],
            '*.{json,md,yaml,yml}': ['biome check --write'],
          })
        );
        const packageJson = await readJson<{
          devDependencies: Record<string, string>;
          devEngines?: unknown;
        }>('package.json');
        packageJson.devDependencies['lint-staged'] = '^15.0.0';
        packageJson.devEngines = {
          packageManager: { name: 'pnpm', version: '>=9' },
          runtime: { name: 'node', version: '>=22' },
        };
        await fs.writeFile(
          path.join(cwd, 'package.json'),
          JSON.stringify(packageJson)
        );

        // The project now has the configs that sync manages, so no task is actionable.
        await syncCommand.run?.({ args: { cwd, yes: true } } as never);
        expect(process.exitCode).toBe(0);
      } finally {
        process.exitCode = 0;
      }
    });
  }, 30_000);

  test('detects outdated config and applies updates', async () => {
    await withProject(
      { ...MINIMAL_FILES, ...OUTDATED_LINT_FILES },
      async ({ cwd, readJson }) => {
        await syncCommand.run?.({ args: { cwd, yes: true } } as never);

        const biome = await readJson<{ vcs?: unknown }>('biome.json');
        expect(biome.vcs).toBeDefined();
      }
    );
  }, 60_000);
});

describe('sync command', () => {
  test('dry-run exits 1 when pending changes exist', async () => {
    await withProject(
      { ...MINIMAL_FILES, ...OUTDATED_LINT_FILES },
      async ({ cwd }) => {
        process.exitCode = 0;
        try {
          await syncCommand.run?.({
            args: { cwd, dryRun: true, quiet: true },
          } as never);
          expect(process.exitCode).toBe(1);
        } finally {
          process.exitCode = 0;
        }
      }
    );
  }, 60_000);

  test('applies conflicting tasks when --include-conflicts is passed with --yes', async () => {
    await withProject(
      {
        ...MINIMAL_FILES,
        'tsconfig.json': '{"compilerOptions":{"strict":false}}\n',
      },
      async ({ cwd, readJson }) => {
        process.exitCode = 0;
        try {
          await syncCommand.run?.({
            args: { cwd, includeConflicts: true, yes: true },
          } as never);

          // Applying the conflict must add the missing strict options.
          // defu preserves the user's `strict: false`, so assert on a key
          // that is only present after the conflict is applied.
          const tsconfig = await readJson<{
            compilerOptions: { noUnusedLocals?: boolean };
          }>('tsconfig.json');
          expect(tsconfig.compilerOptions.noUnusedLocals).toBe(true);
        } finally {
          process.exitCode = 0;
        }
      }
    );
  }, 60_000);
});

describe('sync task selection via .xtarterizerc', () => {
  // Fixture shared by the selection tests: an outdated biome.json puts
  // `lint/biome` into `patch` status and a tsconfig with strict:false puts
  // `ts/incremental` into `patch` status (`ts/strict` becomes `conflict`,
  // which sync does not apply without --include-conflicts).
  const selectionFiles: ProjectFileMap = {
    ...MINIMAL_FILES,
    ...OUTDATED_LINT_FILES,
  };

  test('sync honors skip from .xtarterizerc', async () => {
    await withProject(selectionFiles, async ({ cwd, readJson }) => {
      await fs.writeFile(
        path.join(cwd, '.xtarterizerc'),
        JSON.stringify({ skip: ['ts/incremental'] })
      );

      await syncCommand.run?.({ args: { cwd, yes: true } } as never);

      // The skipped task must NOT have been applied...
      const tsconfig = await readJson<{
        compilerOptions: { incremental?: unknown };
      }>('tsconfig.json');
      expect(tsconfig.compilerOptions.incremental).toBeUndefined();

      // ...while other pending tasks were.
      const biome = await readJson<{ vcs?: unknown }>('biome.json');
      expect(biome.vcs).toBeDefined();
    });
  }, 60_000);

  test('--only overrides config.only', async () => {
    await withProject(selectionFiles, async ({ cwd, readJson }) => {
      await fs.writeFile(
        path.join(cwd, '.xtarterizerc'),
        JSON.stringify({ only: ['ts/incremental', 'lint/biome'] })
      );

      await syncCommand.run?.({
        args: { cwd, only: 'lint/biome', yes: true },
      } as never);

      // CLI --only replaces the config list entirely: lint/biome runs,
      // ts/incremental stays untouched despite being listed in config.
      const biome = await readJson<{ vcs?: unknown }>('biome.json');
      expect(biome.vcs).toBeDefined();

      const tsconfig = await readJson<{
        compilerOptions: { incremental?: unknown };
      }>('tsconfig.json');
      expect(tsconfig.compilerOptions.incremental).toBeUndefined();
    });
  }, 60_000);
});

describe('init command', () => {
  test('dry-run exits 1 when tasks are pending', async () => {
    await withProject(MINIMAL_FILES, async ({ cwd }) => {
      process.exitCode = 0;
      try {
        await initCommand.run?.({
          args: { cwd, dryRun: true, quiet: true },
        } as never);
        expect(process.exitCode).toBe(1);
      } finally {
        process.exitCode = 0;
      }
    });
  }, 60_000);

  test('applies conflicting tasks when --include-conflicts is passed with --yes', async () => {
    await withProject(
      {
        ...MINIMAL_FILES,
        'tsconfig.json': '{"compilerOptions":{"strict":false}}\n',
      },
      async ({ cwd, readJson }) => {
        // Stub installs: conflict file writes still run, only the nypm
        // batch and skills dlx spawns are skipped.
        const installer = recordingDepsInstaller();
        const runner = recordingProcessRunner();
        const layer = Layer.mergeAll(
          installer.layer,
          runner.layer,
          Prompter.layer
        );
        process.exitCode = 0;
        try {
          await runWith(
            layer,
            initProgram({ cwd, includeConflicts: true, yes: true } as never)
          );

          // Applying the conflict must add the missing strict options.
          // defu preserves the user's `strict: false`, so assert on a key
          // that is only present after the conflict is applied.
          const tsconfig = await readJson<{
            compilerOptions: { noUnusedLocals?: boolean };
          }>('tsconfig.json');
          expect(tsconfig.compilerOptions.noUnusedLocals).toBe(true);
          expect(installer.calls.length).toBe(1);
        } finally {
          process.exitCode = 0;
        }
      }
    );
  }, 240_000);
});

describe('add command', () => {
  test('applies a valid task ID', async () => {
    await withProject(MINIMAL_FILES, async ({ cwd, readJson }) => {
      process.exitCode = 0;
      try {
        await addCommand.run?.({
          args: { cwd, quiet: true, taskId: 'release/czg' },
        } as never);

        const pkg = await readJson<{ scripts?: Record<string, string> }>(
          'package.json'
        );
        // Assert the outcome, not `process.exitCode`: it is a process-wide
        // global that unrelated async paths (e.g. install child-process
        // callbacks) can flip to 1 after the command resolved, which made
        // this assertion fail on CI runners while the identical code passed
        // locally. Deterministic exit-code failure paths are covered by the
        // invalid-task-ID test below.
        expect(pkg.scripts?.commit).toBe('czg');
      } finally {
        process.exitCode = 0;
      }
    });
  }, 60_000);

  test('handles invalid task ID gracefully', async () => {
    await withProject(MINIMAL_FILES, async ({ cwd }) => {
      try {
        // Should not throw - just logs an error
        await addCommand.run?.({
          args: { cwd, quiet: true, taskId: 'nonexistent/task' },
        } as never);
        expect(process.exitCode).toBe(1);
      } finally {
        process.exitCode = 0;
      }
    });
  });
});

describe('add command', () => {
  test('reports conflict tasks as not applied and exits 1', async () => {
    await withProject(MINIMAL_FILES, async ({ cwd, readText }) => {
      process.exitCode = 0;
      try {
        await fs.writeFile(
          path.join(cwd, 'tsconfig.json'),
          '{"compilerOptions":{"strict":false}}\n'
        );
        const original = '{"compilerOptions":{"strict":false}}\n';

        await addCommand.run?.({
          args: { cwd, quiet: true, taskId: 'ts/strict' },
        } as never);

        expect(process.exitCode).toBe(1);
        // The conflicting file must NOT have been overwritten
        expect(await readText('tsconfig.json')).toBe(original);
      } finally {
        process.exitCode = 0;
      }
    });
  }, 60_000);
});

describe('add command', () => {
  test('applies conflicting tasks when --include-conflicts is passed with --all', async () => {
    // A TS-only fixture trims `add --all` to a smaller task set than
    // the react+vite fixture (no vite-plugin tasks), but release/
    // quality tasks (czg, knip, ...) still request dev deps. Installs are
    // stubbed, so the test asserts file outcomes plus the batched request.
    await withProject(
      {
        'package.json': {
          devDependencies: { typescript: '^5.0.0' },
          name: 'cmd-test-fixture',
          type: 'module',
          version: '1.0.0',
        },
        'tsconfig.json': '{"compilerOptions":{"strict":false}}\n',
      },
      async ({ cwd, readJson }) => {
        const installer = recordingDepsInstaller();
        const runner = recordingProcessRunner();
        const layer = Layer.mergeAll(
          installer.layer,
          runner.layer,
          Prompter.layer
        );
        process.exitCode = 0;
        try {
          await runWith(
            layer,
            addProgram({
              all: true,
              cwd,
              includeConflicts: true,
              quiet: true,
            } as never)
          );

          // Do not assert exitCode: `add --all` applies every applicable
          // task, and unrelated tasks may fail on a minimal fixture (e.g.
          // vite plugins without a vite.config). The behavior under test is
          // that the conflicting task WAS included and applied - same
          // assertion style as the init/sync conflict tests above.
          // Applying the conflict must add the missing strict options.
          // defu preserves the user's `strict: false`, so assert on a key
          // that is only present after the conflict is applied.
          const tsconfig = await readJson<{
            compilerOptions: { noUnusedLocals?: boolean };
          }>('tsconfig.json');
          expect(tsconfig.compilerOptions.noUnusedLocals).toBe(true);
          expect(installer.calls.length).toBe(1);
          expect(installer.calls[0]?.[1].length).toBeGreaterThan(0);
        } finally {
          process.exitCode = 0;
        }
      }
    );
    // add --all applies every applicable task, including release/quality
    // tasks that request dev dependencies (czg, commit-and-tag-version,
    // knip, ...). Installs are stubbed here; the live nypm flow stays
    // covered by the single-task `add release/czg` idempotency test below.
  }, 240_000);
});

describe('add command', () => {
  test('adds a conflicting task with --include-conflicts on a specific task ID', async () => {
    await withProject(
      {
        ...MINIMAL_FILES,
        'tsconfig.json': '{"compilerOptions":{"strict":false}}\n',
      },
      async ({ cwd, readJson }) => {
        process.exitCode = 0;
        try {
          await addCommand.run?.({
            args: {
              cwd,
              includeConflicts: true,
              quiet: true,
              taskId: 'ts/strict',
            },
          } as never);

          expect(process.exitCode).toBe(0);
          const tsconfig = await readJson<{
            compilerOptions: { noUnusedLocals?: boolean };
          }>('tsconfig.json');
          expect(tsconfig.compilerOptions.noUnusedLocals).toBe(true);
        } finally {
          process.exitCode = 0;
        }
      }
    );
  }, 60_000);

  test('skips already-configured task', async () => {
    await withProject(MINIMAL_FILES, async ({ cwd, readJson }) => {
      // First apply czg
      await addCommand.run?.({
        args: { cwd, quiet: true, taskId: 'release/czg' },
      } as never);

      const pkgBefore = await readJson<{ scripts?: Record<string, string> }>(
        'package.json'
      );

      // Apply again - should be idempotent
      await addCommand.run?.({
        args: { cwd, quiet: true, taskId: 'release/czg' },
      } as never);

      const pkgAfter = await readJson<{ scripts?: Record<string, string> }>(
        'package.json'
      );
      expect(pkgAfter.scripts).toEqual(pkgBefore.scripts);
    });
  }, 60_000);
});

describe('add command', () => {
  test('reports failed task checks in JSON ok field instead of claiming success', async () => {
    await withProject(MINIMAL_FILES, async ({ cwd }) => {
      process.exitCode = 0;
      try {
        // A misbehaving task whose check() dies must surface as ok:false in the
        // emitted JSON, agreeing with the exit code.
        mockGetAllTasks.mockImplementationOnce(() => [
          {
            applicable: () => true,
            apply: () => Effect.void,
            check: () => Effect.die(new Error('kaboom')),
            dryRun: () => Effect.succeed([]),
            group: 'test',
            id: 'boom/failing',
            label: 'Boom failing',
          } as never,
        ]);

        const { logs } = await captureConsole(async () => {
          await addCommand.run?.({
            args: { all: true, cwd, format: 'json', quiet: true },
          } as never);
        });

        expect(process.exitCode).toBe(1);
        const jsonLine = logs.find((line) => line.startsWith('{'));
        expect(jsonLine).toBeDefined();
        const parsed = JSON.parse(jsonLine as string) as { ok: boolean };
        expect(parsed.ok).toBe(false);
      } finally {
        process.exitCode = 0;
      }
    });
  }, 60_000);
});

describe('undo command', () => {
  test('reverts the last run', async () => {
    await withProject(MINIMAL_FILES, async ({ cwd, readText }) => {
      await fs.writeFile(path.join(cwd, 'test.txt'), 'original content');
      await backupFile(cwd, 'test.txt');
      await writeRunManifest(cwd, ['test.txt']);
      await fs.writeFile(path.join(cwd, 'test.txt'), 'modified content');

      await undoCommand.run?.({ args: { cwd, quiet: true } } as never);

      expect(await readText('test.txt')).toBe('original content');
    });
  });

  test('removes files that were created by the run (no backup exists)', async () => {
    await withProject(MINIMAL_FILES, async ({ cwd }) => {
      try {
        // Simulate a run that created a brand-new file: the manifest
        // lists it, but backupFile skipped it because it did not exist.
        await fs.writeFile(path.join(cwd, 'created.txt'), 'new content');
        await writeRunManifest(cwd, ['created.txt']);

        await undoCommand.run?.({ args: { cwd, quiet: true } } as never);

        await expect(
          fs.access(path.join(cwd, 'created.txt'))
        ).rejects.toThrow();
        // Outcome-only assertion (see the add test above): the process-global
        // exitCode is mutated by async paths outside this command's control.
      } finally {
        process.exitCode = 0;
      }
    });
  });

  test('handles missing manifest gracefully', async () => {
    await withProject(MINIMAL_FILES, async ({ cwd }) => {
      try {
        const manifest = await readRunManifest(cwd);
        expect(manifest).toBeNull();

        // Should not throw - just logs an error
        await undoCommand.run?.({ args: { cwd, quiet: true } } as never);
        expect(process.exitCode).toBe(1);
      } finally {
        process.exitCode = 0;
      }
    });
  });
});

describe('restore command', () => {
  test('restores a specific file from backup', async () => {
    await withProject(MINIMAL_FILES, async ({ cwd, readText }) => {
      await fs.writeFile(path.join(cwd, 'restore-me.txt'), 'original text');
      await backupFile(cwd, 'restore-me.txt');
      await fs.writeFile(path.join(cwd, 'restore-me.txt'), 'modified text');

      await restoreCommand.run?.({
        args: { cwd, filepath: 'restore-me.txt' },
      } as never);

      expect(await readText('restore-me.txt')).toBe('original text');
    });
  });

  test('handles missing backups gracefully', async () => {
    await withProject(MINIMAL_FILES, async ({ cwd }) => {
      try {
        // Should not throw - just logs an error
        await restoreCommand.run?.({
          args: { cwd, filepath: 'nonexistent.txt' },
        } as never);
        expect(process.exitCode).toBe(1);
      } finally {
        process.exitCode = 0;
      }
    });
  });
});
