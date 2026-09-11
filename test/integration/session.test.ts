import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { addCommand } from '@xtarterize/app/commands/add/index.js';
import { listCommand } from '@xtarterize/app/commands/list.js';
import { openSession } from '@xtarterize/app/session.js';
import {
  createScriptedPrompter,
  setPrompter,
} from '@xtarterize/app/ui/prompter.js';
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

import { run } from '../helpers/run.js';

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

async function createMinimalProject(): Promise<string> {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-session-'));
  await fs.mkdir(path.join(cwd, '.git'), { recursive: true });
  await fs.writeFile(
    path.join(cwd, 'package.json'),
    JSON.stringify({
      dependencies: { react: '^18.2.0' },
      devDependencies: { typescript: '^5.0.0', vite: '^5.0.0' },
      name: 'session-test-fixture',
      type: 'module',
      version: '1.0.0',
    })
  );
  return cwd;
}

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
  setPrompter(null);
  vi.clearAllMocks();
  process.exitCode = 0;
});

describe('command session', () => {
  test('runs open, plan, execute, and report in lifecycle order', async () => {
    const cwd = await createMinimalProject();
    try {
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
    } finally {
      await fs.rm(cwd, { force: true, recursive: true });
    }
  });

  test('runs one gitignore and one preflight pass per open', async () => {
    const cwd = await createMinimalProject();
    try {
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
    } finally {
      await fs.rm(cwd, { force: true, recursive: true });
    }
  });

  test('reports cancellation as an outcome with no writes', async () => {
    const cwd = await createMinimalProject();
    const previousCi = process.env.CI;
    setCi('false');
    setPrompter(createScriptedPrompter({ groupMultiselects: [null] }));
    try {
      await addCommand.run?.({ args: { cwd } } as never);

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
      await fs.rm(cwd, { force: true, recursive: true });
    }
  });

  test('runs a scripted interactive add as one plan with one manifest', async () => {
    const cwd = await createMinimalProject();
    const previousCi = process.env.CI;
    setCi('false');
    setPrompter(
      createScriptedPrompter({
        confirms: [true],
        groupMultiselects: [[PANEL]],
      })
    );
    try {
      await addCommand.run?.({ args: { cwd } } as never);

      expect(coreMocks.executePlan).toHaveBeenCalledTimes(1);

      const manifest = await readRunManifest(cwd);
      expect(manifest).not.toBeNull();
      expect(manifest?.files).toContain('tsconfig.json');

      const tsconfig = JSON.parse(
        await fs.readFile(path.join(cwd, 'tsconfig.json'), 'utf-8')
      ) as { compilerOptions?: { noUnusedLocals?: boolean; strict?: boolean } };
      expect(tsconfig.compilerOptions?.strict).toBe(true);
      expect(tsconfig.compilerOptions?.noUnusedLocals).toBe(true);
      expect(process.exitCode).toBe(0);
    } finally {
      setCi(previousCi);
      await fs.rm(cwd, { force: true, recursive: true });
    }
  });

  test('renders a --json preflight failure as a JSON payload', async () => {
    const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-session-'));
    const logs: Array<string> = [];
    const originalLog = console.log;
    console.log = (...args: Array<unknown>) => {
      logs.push(args.map((arg) => String(arg)).join(' '));
    };
    try {
      await listCommand.run?.({ args: { cwd, json: true } } as never);
    } finally {
      console.log = originalLog;
    }

    try {
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0]?.trim().startsWith('{')).toBe(true);
      const payload = JSON.parse(logs[0] ?? '') as {
        errors: Array<{ code: string }>;
        ok: boolean;
      };
      expect(payload.ok).toBe(false);
      expect(payload.errors[0]?.code).toBe('MISSING_PACKAGE_JSON');
      expect(process.exitCode).toBe(1);
    } finally {
      await fs.rm(cwd, { force: true, recursive: true });
    }
  });
});
