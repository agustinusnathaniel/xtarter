import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { doctorCommand } from '@xtarterize/app/commands/doctor.js';
import { describe, expect } from 'vite-plus/test';

async function createProjectFixture(): Promise<string> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xtarterize-doctor-'));
  await fs.mkdir(path.join(tmpDir, '.git'), { recursive: true });
  await fs.writeFile(
    path.join(tmpDir, 'package.json'),
    JSON.stringify({
      devDependencies: {
        '@biomejs/biome': '^2.0.0',
        typescript: '^5.3.0',
      },
      name: 'doctor-fixture',
      version: '1.0.0',
    })
  );
  return tmpDir;
}

function captureLogs<T>(fn: () => Promise<T>): {
  logs: Array<string>;
  result: Promise<T>;
} {
  const logs: Array<string> = [];
  const originalLog = console.log;
  console.log = (...args: Array<unknown>) => {
    logs.push(args.map((arg) => String(arg)).join(' '));
  };
  const result = fn().finally(() => {
    console.log = originalLog;
  });
  return { logs, result };
}

describe('doctor command', () => {
  test('emits machine-readable diagnostics in JSON mode', async () => {
    const cwd = await createProjectFixture();
    const { logs, result } = captureLogs(() =>
      doctorCommand.run?.({ args: { cwd, json: true } } as never)
    );
    await result;

    expect(logs.length).toBeGreaterThan(0);
    const payload = JSON.parse(logs.at(-1)) as {
      ok: boolean;
      summary: { total: number; pass: number; warn: number; fail: number };
      diagnostics: Array<{ name: string; status: string; message: string }>;
    };

    expect(payload.ok).toBe(true);
    expect(payload.summary.total).toBeGreaterThan(0);
    expect(payload.diagnostics.length).toBe(payload.summary.total);
    expect(Array.isArray(payload.diagnostics)).toBe(true);
  });

  test('outputs summary line in quiet mode', async () => {
    const cwd = await createProjectFixture();
    const { logs, result } = captureLogs(() =>
      doctorCommand.run?.({ args: { cwd, quiet: true } } as never)
    );
    await result;

    expect(logs.length).toBeGreaterThan(0);
    const lastLine = logs.at(-1);
    expect(lastLine).toMatch(/\d+ passed/);
  });

  test('includes system info in verbose mode', async () => {
    const cwd = await createProjectFixture();
    const { logs, result } = captureLogs(() =>
      doctorCommand.run?.({ args: { cwd, verbose: true } } as never)
    );
    await result;

    const fullOutput = logs.join(' ');
    expect(fullOutput).toContain('System');
    expect(fullOutput).toMatch(/(CPUs|GB RAM)/);
  });

  test('includes project health diagnostics', async () => {
    const cwd = await createProjectFixture();
    // Add a tsconfig.json to make the TypeScript check pass
    await fs.writeFile(path.join(cwd, 'tsconfig.json'), JSON.stringify({}));

    const { logs, result } = captureLogs(() =>
      doctorCommand.run?.({ args: { cwd, json: true } } as never)
    );
    await result;

    const payload = JSON.parse(logs.at(-1)) as {
      diagnostics: Array<{ name: string; message: string }>;
    };

    const tsCheck = payload.diagnostics.find(
      (d) => d.name === 'TypeScript config'
    );
    expect(tsCheck).toBeDefined();
    expect(tsCheck?.message).toContain('tsconfig.json');
  });

  test('exits 0 when all diagnostics pass', async () => {
    const cwd = await createProjectFixture();
    process.exitCode = 0;
    try {
      await doctorCommand.run?.({ args: { cwd, json: true } } as never);
      expect(process.exitCode).toBe(0);
    } finally {
      process.exitCode = 0;
      await fs.rm(cwd, { force: true, recursive: true });
    }
  });
});
