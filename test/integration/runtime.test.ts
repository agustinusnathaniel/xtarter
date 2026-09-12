import fs from 'node:fs/promises';
import path from 'node:path';
import { queryCommand } from '@xtarterize/app/commands/query.js';
import { abortCliProgram, runCliProgram } from '@xtarterize/app/runtime.js';
import { Effect } from 'effect';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from 'vite-plus/test';

import { withTempDir } from '../helpers/temp.js';

const coreMocks = vi.hoisted(() => ({
  logError: vi.fn(),
  resolveTaskStatuses: vi.fn(),
}));

// runtime.ts and command sources resolve @xtarterize/core through
// apps/xtarterize/node_modules to the built entry, so the mock targets that
// resolved module id.
vi.mock('/packages/core/dist/index.mjs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@xtarterize/core')>();
  return {
    ...actual,
    logError: coreMocks.logError,
    resolveTaskStatuses: coreMocks.resolveTaskStatuses,
  };
});

async function setupMinimalProject(dir: string): Promise<void> {
  await fs.mkdir(path.join(dir, '.git'), { recursive: true });
  await fs.writeFile(
    path.join(dir, 'package.json'),
    JSON.stringify({
      dependencies: { react: '^18.2.0' },
      devDependencies: { typescript: '^5.0.0', vite: '^5.0.0' },
      name: 'runtime-test-fixture',
      type: 'module',
      version: '1.0.0',
    })
  );
}

let savedExitCode: typeof process.exitCode;

beforeEach(() => {
  savedExitCode = process.exitCode;
  process.exitCode = 0;
  coreMocks.logError.mockClear();
});

afterEach(() => {
  process.exitCode = savedExitCode;
});

describe('runCliProgram contract', () => {
  test('aborting a long-running program resolves undefined with exit code 0', async () => {
    const controller = new AbortController();
    let markStarted: (() => void) | undefined;
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });

    const running = runCliProgram(
      Effect.flatMap(
        Effect.sync(() => markStarted?.()),
        () => Effect.never
      ),
      { signal: controller.signal }
    );
    await started;
    controller.abort();

    await expect(running).resolves.toBeUndefined();
    expect(process.exitCode).toBe(0);
    expect(coreMocks.logError).not.toHaveBeenCalled();
  });

  test('a failing program resolves undefined, sets exit code 1, and renders once', async () => {
    const running = runCliProgram(Effect.fail(new Error('boom')));

    await expect(running).resolves.toBeUndefined();
    expect(process.exitCode).toBe(1);
    expect(coreMocks.logError).toHaveBeenCalledTimes(1);
    expect(coreMocks.logError).toHaveBeenCalledWith('boom');
  });
});

// Declared last on purpose: abortCliProgram() permanently aborts the shared
// controller, so any test that relies on the default signal must run before.
describe('query interruption', () => {
  test('interrupting extra status resolution returns instead of crashing', async () => {
    await withTempDir('xtarterize-runtime-', async (cwd) => {
      await setupMinimalProject(cwd);
      coreMocks.resolveTaskStatuses.mockReturnValue(Effect.never);
      const running = queryCommand.run?.({
        args: { cwd, json: true, query: 'oxlint' },
      } as never);

      await vi.waitFor(
        () => {
          expect(coreMocks.resolveTaskStatuses).toHaveBeenCalledTimes(1);
        },
        { timeout: 15_000 }
      );

      abortCliProgram();
      await expect(running).resolves.toBeUndefined();
      expect(process.exitCode).toBe(0);
      expect(coreMocks.logError).not.toHaveBeenCalled();
    });
  }, 30_000);
});
