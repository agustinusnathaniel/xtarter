import { captureConsole, captureJson } from '@test/helpers/console.js';
import { type ProjectFileMap, withProject } from '@test/helpers/project.js';
import {
  recordingDepsInstaller,
  recordingProcessRunner,
  runWith,
} from '@test/helpers/run.js';
import { addCommand, addProgram } from '@xtarterize/app/commands/add/index.js';
import { initCommand, initProgram } from '@xtarterize/app/commands/init.js';
import { syncCommand } from '@xtarterize/app/commands/sync.js';
import { Prompter } from '@xtarterize/app/ui/prompter.js';
import { Layer } from 'effect';
import { describe, expect } from 'vite-plus/test';

const PROJECT_FILES: ProjectFileMap = {
  'package.json': {
    dependencies: { react: '^18.2.0' },
    devDependencies: { typescript: '^5.0.0', vite: '^5.0.0' },
    name: 'json-output-fixture',
    type: 'module',
    version: '1.0.0',
  },
  'tsconfig.json': '{"compilerOptions":{}}\n',
  'vite.config.ts': 'export default {}\n',
};

const MINIMAL_FILES: ProjectFileMap = {
  'package.json': {
    dependencies: { react: '^18.2.0' },
    devDependencies: { typescript: '^5.0.0', vite: '^5.0.0' },
    name: 'json-output-fixture',
    type: 'module',
    version: '1.0.0',
  },
};

describe('init/sync/add json output', () => {
  test('init --dry-run --json emits a single machine-readable JSON payload', async () => {
    await withProject(PROJECT_FILES, async ({ cwd }) => {
      try {
        const { logs } = await captureConsole(async () => {
          await initCommand.run?.({
            args: { cwd, dryRun: true, json: true },
          } as never);
        });

        const stdout = logs.join('\n');
        // The diff payload is the only thing on stdout - no human text.
        expect(stdout).not.toContain('Conformance plan');
        expect(stdout).not.toContain('Timing');
        const parsed = JSON.parse(logs.at(-1));
        expect(parsed).toHaveProperty('ok');
        expect(parsed).toHaveProperty('summary');
        expect(parsed).toHaveProperty('files');
      } finally {
        process.exitCode = 0;
      }
    });
  }, 60_000);

  test('init --compose --quiet suppresses the compose banner', async () => {
    await withProject(PROJECT_FILES, async ({ cwd }) => {
      try {
        const { logs } = await captureConsole(async () => {
          await initCommand.run?.({
            args: {
              compose: 'strict typescript',
              cwd,
              dryRun: true,
              quiet: true,
            },
          } as never);
        });

        expect(logs.join('\n')).not.toContain('Composing plan');
      } finally {
        process.exitCode = 0;
      }
    });
  }, 60_000);
});

describe('init/sync/add json output', () => {
  test('init --yes --json emits an apply result payload', async () => {
    await withProject(PROJECT_FILES, async ({ cwd }) => {
      // Stub installs: file writes still run, so the payload shape stays
      // identical, but no nypm/pnpm spawn, dlx, or network happens. Both
      // DepsInstaller (nypm batch) and ProcessRunner (skills dlx) are
      // stubbed; the live nypm flow stays covered by single-task add tests.
      const installer = recordingDepsInstaller();
      const runner = recordingProcessRunner();
      const layer = Layer.mergeAll(
        installer.layer,
        runner.layer,
        Prompter.layer
      );
      try {
        const output = (await captureJson(async () => {
          await runWith(
            layer,
            initProgram({ cwd, json: true, yes: true } as never)
          );
        })) as {
          ok: boolean;
          applied: number;
          skipped: number;
          errors: Array<string>;
        };

        // Apply may fail on dependency install in the sandbox - the
        // payload must still carry the result shape.
        expect(typeof output.ok).toBe('boolean');
        expect(typeof output.applied).toBe('number');
        expect(typeof output.skipped).toBe('number');
        expect(Array.isArray(output.errors)).toBe(true);
        // Batching contract: one install call carrying the collected deps.
        expect(installer.calls.length).toBe(1);
        expect(installer.calls[0]?.[0]).toBe(cwd);
        expect(installer.calls[0]?.[1].length).toBeGreaterThan(0);
      } finally {
        process.exitCode = 0;
      }
    });
  }, 180_000);

  test('add lint/biome --format json emits a result payload', async () => {
    await withProject(PROJECT_FILES, async ({ cwd }) => {
      try {
        const { logs } = await captureConsole(async () => {
          await addCommand.run?.({
            args: { cwd, format: 'json', quiet: true, taskId: 'lint/biome' },
          } as never);
        });

        const stdout = logs.join('\n');
        expect(stdout).not.toContain('Applied');
        expect(stdout).not.toContain('Available tasks');
        const parsed = JSON.parse(logs.at(-1)) as {
          ok: boolean;
          taskId: string;
          applied: number;
          errors: Array<string>;
        };
        expect(typeof parsed.ok).toBe('boolean');
        expect(parsed.taskId).toBe('lint/biome');
        expect(typeof parsed.applied).toBe('number');
        expect(Array.isArray(parsed.errors)).toBe(true);
      } finally {
        process.exitCode = 0;
      }
    });
  }, 120_000);
});

describe('init/sync/add json output', () => {
  test('add ts/strict --format json emits the payload as the first thing on stdout', async () => {
    await withProject(PROJECT_FILES, async ({ cwd }) => {
      try {
        const output = (await captureJson(async () => {
          await addCommand.run?.({
            args: { cwd, format: 'json', quiet: true, taskId: 'ts/strict' },
          } as never);
        })) as {
          ok: boolean;
          taskId: string;
          applied: number;
          errors: Array<string>;
        };

        // The apply pipeline runs before the payload is emitted - the
        // hardened captureJson contract above proves no leading blank line
        // (or human text) precedes it.
        expect(typeof output.ok).toBe('boolean');
        expect(output.taskId).toBe('ts/strict');
        expect(output.applied).toBe(1);
        expect(Array.isArray(output.errors)).toBe(true);
      } finally {
        process.exitCode = 0;
      }
    });
  }, 120_000);
});

describe('init/sync/add json output', () => {
  test('add ts/strict --json ignores check errors from unrelated tasks', async () => {
    // A malformed unrelated config makes the lint/biome check fail; the
    // requested ts/strict task must still apply and report success.
    await withProject(
      { ...MINIMAL_FILES, 'biome.json': '{ not valid json' },
      async ({ cwd, readJson }) => {
        process.exitCode = 0;
        try {
          const output = (await captureJson(async () => {
            await addCommand.run?.({
              args: { cwd, json: true, taskId: 'ts/strict' },
            } as never);
          })) as {
            ok: boolean;
            applied: number;
            errors: Array<string>;
            taskId: string;
          };

          expect(process.exitCode).toBe(0);
          expect(output.ok).toBe(true);
          expect(output.applied).toBe(1);
          expect(output.taskId).toBe('ts/strict');

          const tsconfig = await readJson<{
            compilerOptions?: { strict?: boolean };
          }>('tsconfig.json');
          expect(tsconfig.compilerOptions?.strict).toBe(true);
        } finally {
          process.exitCode = 0;
        }
      }
    );
  }, 120_000);
});

describe('init/sync/add json output', () => {
  test('add ts/strict --json reports the requested task check failure', async () => {
    // The requested task's own check reads a malformed tsconfig.json, so
    // the run must fail with that task's check error.
    await withProject(
      { ...MINIMAL_FILES, 'tsconfig.json': '{ not valid json' },
      async ({ cwd }) => {
        process.exitCode = 0;
        try {
          const output = (await captureJson(async () => {
            await addCommand.run?.({
              args: { cwd, json: true, taskId: 'ts/strict' },
            } as never);
          })) as { ok: boolean; errors: Array<string> };

          expect(process.exitCode).toBe(1);
          expect(output.ok).toBe(false);
          expect(
            output.errors.some((error) =>
              error.includes('Failed to check ts/strict')
            )
          ).toBe(true);
        } finally {
          process.exitCode = 0;
        }
      }
    );
  }, 60_000);

  test('add --json without a terminal reports check errors instead of false success', async () => {
    // In test runs stdout is not a TTY, so --json takes the non-interactive
    // path. A malformed unrelated config must surface as a failed payload.
    await withProject(
      { ...MINIMAL_FILES, 'biome.json': '{ not valid json' },
      async ({ cwd }) => {
        process.exitCode = 0;
        try {
          const output = (await captureJson(async () => {
            await addCommand.run?.({ args: { cwd, json: true } } as never);
          })) as { ok: boolean; errors: Array<string> };

          expect(process.exitCode).toBe(1);
          expect(output.ok).toBe(false);
          expect(
            output.errors.some((error) =>
              error.includes('Failed to check lint/biome')
            )
          ).toBe(true);
        } finally {
          process.exitCode = 0;
        }
      }
    );
  }, 60_000);
});

describe('init/sync/add json output', () => {
  test('add --all --format json emits a summary payload', async () => {
    await withProject(PROJECT_FILES, async ({ cwd }) => {
      const installer = recordingDepsInstaller();
      const runner = recordingProcessRunner();
      const layer = Layer.mergeAll(
        installer.layer,
        runner.layer,
        Prompter.layer
      );
      try {
        const output = (await captureJson(async () => {
          await runWith(
            layer,
            addProgram({ all: true, cwd, format: 'json', quiet: true } as never)
          );
        })) as {
          ok: boolean;
          applied: number;
          skipped: number;
          errors: Array<string>;
        };

        expect(typeof output.ok).toBe('boolean');
        expect(typeof output.applied).toBe('number');
        expect(typeof output.skipped).toBe('number');
        expect(Array.isArray(output.errors)).toBe(true);
        expect(installer.calls.length).toBe(1);
        expect(installer.calls[0]?.[1].length).toBeGreaterThan(0);
      } finally {
        process.exitCode = 0;
      }
    });
  }, 180_000);
});

describe('init/sync/add json output', () => {
  test('sync --yes --json emits a machine-readable result payload with no human text', async () => {
    await withProject(MINIMAL_FILES, async ({ cwd }) => {
      try {
        const { logs } = await captureConsole(async () => {
          await syncCommand.run?.({
            args: { cwd, json: true, yes: true },
          } as never);
        });

        const stdout = logs.join('\n');
        // The result payload is the only thing on stdout - no human text.
        expect(stdout).not.toContain('No updates available');
        expect(stdout).not.toContain('Applied');
        expect(stdout).not.toContain('Conformance plan');
        expect(stdout).not.toContain('Timing');

        // Parse the last line (the JSON result payload), matching
        // captureJson's contract.
        const parsed = JSON.parse(logs.at(-1)) as {
          ok: boolean;
          applied: number;
          skipped: number;
          errors: Array<string>;
        };
        expect(typeof parsed.ok).toBe('boolean');
        expect(typeof parsed.applied).toBe('number');
        expect(typeof parsed.skipped).toBe('number');
        expect(Array.isArray(parsed.errors)).toBe(true);
      } finally {
        process.exitCode = 0;
      }
    });
  }, 120_000);
});
