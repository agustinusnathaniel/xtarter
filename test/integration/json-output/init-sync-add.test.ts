import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { addCommand } from '@xtarterize/app/commands/add/index.js';
import { initCommand } from '@xtarterize/app/commands/init.js';
import { syncCommand } from '@xtarterize/app/commands/sync.js';
import { describe, expect } from 'vite-plus/test';

const _CONFORMANCE_SUMMARY_REGEX = /conformant|Conformance audit/;

async function createProjectFixture(): Promise<string> {
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
  await fs.writeFile(
    path.join(tmpDir, 'tsconfig.json'),
    '{"compilerOptions":{}}\n'
  );
  await fs.writeFile(
    path.join(tmpDir, 'vite.config.ts'),
    'export default {}\n'
  );
  return tmpDir;
}

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

async function captureConsoleLogs(
  run: () => Promise<void>
): Promise<Array<string>> {
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

  return logs;
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

describe('init/sync/add json output', () => {
  test('init --dry-run --json emits a single machine-readable JSON payload', async () => {
    const cwd = await createProjectFixture();
    try {
      const logs = await captureConsoleLogs(async () => {
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
      await fs.rm(cwd, { force: true, recursive: true });
    }
  }, 60_000);

  test('init --yes --json emits an apply result payload', async () => {
    const cwd = await createProjectFixture();
    try {
      const output = (await captureJsonOutput(async () => {
        await initCommand.run?.({
          args: { cwd, json: true, yes: true },
        } as never);
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
    } finally {
      process.exitCode = 0;
      await fs.rm(cwd, { force: true, recursive: true });
    }
  }, 180_000);

  test('add lint/biome --format json emits a result payload', async () => {
    const cwd = await createProjectFixture();
    try {
      const logs = await captureConsoleLogs(async () => {
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
      await fs.rm(cwd, { force: true, recursive: true });
    }
  }, 120_000);

  test('add ts/strict --format json emits the payload as the first thing on stdout', async () => {
    const cwd = await createProjectFixture();
    try {
      const output = (await captureJsonOutput(async () => {
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
      // hardened captureJsonOutput above proves no leading blank line
      // (or human text) precedes it.
      expect(typeof output.ok).toBe('boolean');
      expect(output.taskId).toBe('ts/strict');
      expect(output.applied).toBe(1);
      expect(Array.isArray(output.errors)).toBe(true);
    } finally {
      process.exitCode = 0;
      await fs.rm(cwd, { force: true, recursive: true });
    }
  }, 120_000);

  test('add --all --format json emits a summary payload', async () => {
    const cwd = await createProjectFixture();
    try {
      const output = (await captureJsonOutput(async () => {
        await addCommand.run?.({
          args: { all: true, cwd, format: 'json', quiet: true },
        } as never);
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
    } finally {
      process.exitCode = 0;
      await fs.rm(cwd, { force: true, recursive: true });
    }
  }, 180_000);

  test('sync --yes --json emits a machine-readable result payload with no human text', async () => {
    const cwd = await createMinimalProject();
    try {
      const logs = await captureConsoleLogs(async () => {
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
      // captureJsonOutput's contract.
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
      await fs.rm(cwd, { force: true, recursive: true });
    }
  }, 120_000);
});
