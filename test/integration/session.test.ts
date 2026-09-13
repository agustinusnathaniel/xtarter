import fs from 'node:fs/promises';
import path from 'node:path';
import { addProgram } from '@xtarterize/app/commands/add/index.js';
import { listCommand } from '@xtarterize/app/commands/list.js';
import { openSession } from '@xtarterize/app/session.js';
import { reportSessionOutcome } from '@xtarterize/app/ui/reporter.js';
import { readRunManifest } from '@xtarterize/core';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from 'vite-plus/test';

import { captureJson } from '../helpers/console.js';
import { type ProjectFileMap, withProject } from '../helpers/project.js';
import { createScriptedPrompter } from '../helpers/prompter.js';
import { run, runCli } from '../helpers/run.js';
import { withTempDir } from '../helpers/temp.js';

const coreMocks = vi.hoisted(() => ({
  ensureXtarterizeGitignore: vi.fn(),
  executePlan: vi.fn(),
  planTasks: vi.fn(),
  runPreflight: vi.fn(),
}));

// Wrap the core entry points the session owns so the lifecycle order and the
// one-pass-per-open policy are observable without changing their behavior.
// App sources resolve the workspace package through apps/xtarterize/node_modules
// to the built entry, so the mock must target that resolved id (the root
// tsconfig path mapping only covers root-level test imports).
vi.mock('/packages/core/dist/index.mjs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@xtarterize/core')>();
  coreMocks.ensureXtarterizeGitignore.mockImplementation(
    actual.ensureXtarterizeGitignore
  );
  coreMocks.executePlan.mockImplementation(actual.executePlan);
  coreMocks.planTasks.mockImplementation(actual.planTasks);
  coreMocks.runPreflight.mockImplementation(actual.runPreflight);
  return {
    ...actual,
    ensureXtarterizeGitignore: coreMocks.ensureXtarterizeGitignore,
    executePlan: coreMocks.executePlan,
    planTasks: coreMocks.planTasks,
    runPreflight: coreMocks.runPreflight,
  };
});

// Only the outcome sink is mocked; preflight failures still render for real.
vi.mock('@xtarterize/app/ui/reporter.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@xtarterize/app/ui/reporter.js')>();
  return { ...actual, reportSessionOutcome: vi.fn() };
});

const PANEL = 'ts/strict';

const PROJECT_FILES: ProjectFileMap = {
  'package.json': {
    dependencies: { react: '^18.2.0' },
    devDependencies: { typescript: '^5.0.0', vite: '^5.0.0' },
    name: 'session-test-fixture',
    type: 'module',
    version: '1.0.0',
  },
};

/** `add` only prompts interactively when the process does not look like CI. */
function setCi(value: string | undefined): void {
  if (value === undefined) {
    delete process.env.CI;
  } else {
    process.env.CI = value;
  }
}

const recordedOutcomes = () =>
  vi.mocked(reportSessionOutcome).mock.calls.map(([outcome]) => outcome);

// `process.exitCode` starts undefined in a fresh worker, so initialize it
// before each test instead of relying on a previous test's cleanup. The
// success-path assertions then prove the command leaves it at 0 rather than
// inheriting an unrelated value.
beforeEach(() => {
  process.exitCode = 0;
});

afterEach(() => {
  vi.clearAllMocks();
  process.exitCode = 0;
});

describe('command session', () => {
  test('runs open, plan, execute, and report in lifecycle order', async () => {
    await withProject(PROJECT_FILES, async ({ cwd }) => {
      const session = await run(openSession({ cwd, quiet: true }));
      expect(session).not.toBeNull();
      if (!session) {
        return;
      }

      const task = session.tasks.find((entry) => entry.id === PANEL);
      expect(task).toBeDefined();
      if (!task) {
        return;
      }

      const outcome = await run(session.apply([task]));
      session.reportOutcome(outcome);

      expect(coreMocks.planTasks).toHaveBeenCalledTimes(1);
      expect(coreMocks.executePlan).toHaveBeenCalledTimes(1);
      expect(reportSessionOutcome).toHaveBeenCalledTimes(1);

      const order = [
        coreMocks.ensureXtarterizeGitignore.mock.invocationCallOrder[0],
        coreMocks.runPreflight.mock.invocationCallOrder[0],
        coreMocks.planTasks.mock.invocationCallOrder[0],
        coreMocks.executePlan.mock.invocationCallOrder[0],
        vi.mocked(reportSessionOutcome).mock.invocationCallOrder[0],
      ];
      expect(order).toEqual([...order].sort((a, b) => a - b));
    });
  });

  test('runs one gitignore and one preflight pass per open', async () => {
    await withProject(PROJECT_FILES, async ({ cwd }) => {
      const session = await run(openSession({ cwd, quiet: true }));
      expect(session).not.toBeNull();
      expect(coreMocks.ensureXtarterizeGitignore).toHaveBeenCalledTimes(1);
      expect(coreMocks.runPreflight).toHaveBeenCalledTimes(1);

      if (session) {
        const task = session.tasks.find((entry) => entry.id === PANEL);
        if (task) {
          await run(session.apply([task]));
        }
      }
      // Plan and execute must not repeat open's side effects.
      expect(coreMocks.ensureXtarterizeGitignore).toHaveBeenCalledTimes(1);
      expect(coreMocks.runPreflight).toHaveBeenCalledTimes(1);

      await run(openSession({ cwd, quiet: true }));
      expect(coreMocks.ensureXtarterizeGitignore).toHaveBeenCalledTimes(2);
      expect(coreMocks.runPreflight).toHaveBeenCalledTimes(2);
    });
  });

  test('reports cancellation as an outcome with no writes', async () => {
    await withProject(PROJECT_FILES, async ({ cwd }) => {
      const previousCi = process.env.CI;
      setCi('false');
      const prompter = createScriptedPrompter({ groupMultiselects: [null] });
      try {
        await runCli(addProgram({ cwd }), prompter);

        const outcomes = recordedOutcomes();
        expect(outcomes).toHaveLength(1);
        expect(outcomes[0]?.kind).toBe('cancelled');
        expect(outcomes[0]?.ok).toBe(true);
        expect(coreMocks.executePlan).not.toHaveBeenCalled();
        expect(await readRunManifest(cwd)).toBeNull();
        await expect(
          fs.access(path.join(cwd, 'tsconfig.json'))
        ).rejects.toThrow();
        expect(process.exitCode).toBe(0);
      } finally {
        setCi(previousCi);
      }
    });
  });

  test('runs a scripted interactive add as one plan with one manifest', async () => {
    await withProject(PROJECT_FILES, async ({ cwd, readJson }) => {
      const previousCi = process.env.CI;
      setCi('false');
      const prompter = createScriptedPrompter({
        confirms: [true],
        groupMultiselects: [[PANEL]],
      });
      try {
        await runCli(addProgram({ cwd }), prompter);

        expect(coreMocks.executePlan).toHaveBeenCalledTimes(1);

        const manifest = await readRunManifest(cwd);
        expect(manifest).not.toBeNull();
        expect(manifest?.files).toContain('tsconfig.json');

        const tsconfig = await readJson<{
          compilerOptions?: { noUnusedLocals?: boolean; strict?: boolean };
        }>('tsconfig.json');
        expect(tsconfig.compilerOptions?.strict).toBe(true);
        expect(tsconfig.compilerOptions?.noUnusedLocals).toBe(true);
        expect(process.exitCode).toBe(0);
      } finally {
        setCi(previousCi);
      }
    });
  });

  test('renders a --json preflight failure as a JSON payload', async () => {
    await withTempDir('xtarterize-session-', async (cwd) => {
      const payload = (await captureJson(async () => {
        await listCommand.run?.({ args: { cwd, json: true } } as never);
      })) as {
        errors: Array<{ code: string }>;
        ok: boolean;
      };

      expect(payload.ok).toBe(false);
      expect(payload.errors[0]?.code).toBe('MISSING_PACKAGE_JSON');
      expect(process.exitCode).toBe(1);
    });
  });
});
