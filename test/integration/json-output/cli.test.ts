import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { checkCommand } from '@xtarterize/app/commands/check.js';
import { diffCommand } from '@xtarterize/app/commands/diff.js';
import { listCommand } from '@xtarterize/app/commands/list.js';
import { describe, expect, it, vi } from 'vite-plus/test';

const CONFORMANCE_SUMMARY_REGEX = /conformant|Conformance audit/;

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

async function _createMinimalProject(): Promise<string> {
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

async function _captureConsoleLogs(
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

describe('cli json output', () => {
  test('list command emits machine-readable payload', async () => {
    const cwd = await createProjectFixture();
    const output = (await captureJsonOutput(async () => {
      await listCommand.run?.({ args: { cwd, json: true } } as never);
    })) as {
      ok: boolean;
      profile: Record<string, unknown>;
      tasks: Array<{ id: string; status: string }>;
    };

    expect(output.ok).toBe(true);
    expect(output.profile).toBeTruthy();
    expect(Array.isArray(output.tasks)).toBe(true);
    expect(output.tasks.length).toBeGreaterThan(0);
    expect(typeof output.tasks[0]?.id).toBe('string');
    expect(typeof output.tasks[0]?.status).toBe('string');

    await fs.rm(cwd, { force: true, recursive: true });
  });

  test('check command emits machine-readable payload', async () => {
    const cwd = await createProjectFixture();
    const output = (await captureJsonOutput(async () => {
      await checkCommand.run?.({ args: { cwd, json: true } } as never);
    })) as {
      ok: boolean;
      summary: { conformant: number; total: number };
      tasks: Array<{ id: string; status: string }>;
      diagnostics: Array<{ name: string; status: string; message: string }>;
    };

    expect(output.ok).toBe(false);
    expect(output.summary.total).toBeGreaterThan(0);
    expect(Array.isArray(output.tasks)).toBe(true);
    expect(Array.isArray(output.diagnostics)).toBe(true);

    expect(process.exitCode).toBe(1);
    process.exitCode = 0;

    await fs.rm(cwd, { force: true, recursive: true });
  });

  test('diff command emits machine-readable payload', async () => {
    const cwd = await createProjectFixture();
    const output = (await captureJsonOutput(async () => {
      await diffCommand.run?.({ args: { cwd, json: true } } as never);
    })) as {
      ok: boolean;
      summary: { total: number; stats?: { added: number; removed: number } };
      files: Array<{
        filepath: string;
        action: string;
        before?: string;
        after: string;
        stats?: { added: number; removed: number };
        hunks?: Array<{ header: string; added: number; removed: number }>;
      }>;
    };

    expect(output.ok).toBe(false);
    expect(output.summary.total).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(output.files)).toBe(true);
    if (output.files.length > 0) {
      expect(typeof output.files[0]?.filepath).toBe('string');
      expect(typeof output.files[0]?.after).toBe('string');
    }

    await fs.rm(cwd, { force: true, recursive: true });
  });

  test('diff command exits 1 when pending changes exist', async () => {
    const cwd = await createProjectFixture();
    try {
      await diffCommand.run?.({ args: { cwd, json: true } } as never);
      expect(process.exitCode).toBe(1);
    } finally {
      process.exitCode = 0;
      await fs.rm(cwd, { force: true, recursive: true });
    }
  });

  test('diff command JSON ok field agrees with exit code', async () => {
    const cwd = await createProjectFixture();
    const output = (await captureJsonOutput(async () => {
      await diffCommand.run?.({ args: { cwd, json: true } } as never);
    })) as { ok: boolean };
    expect(output.ok).toBe(false);
    expect(process.exitCode).toBe(1);
    process.exitCode = 0;
    await fs.rm(cwd, { force: true, recursive: true });
  });
});

it('check --json keeps stdout machine-readable when annotations are enabled', async () => {
  const cwd = await createProjectFixture();
  const stdoutChunks: Array<string> = [];
  const stderrChunks: Array<string> = [];
  const stdoutSpy = vi
    .spyOn(process.stdout, 'write')
    .mockImplementation((chunk: unknown) => {
      stdoutChunks.push(String(chunk));
      return true;
    });
  const stderrSpy = vi
    .spyOn(process.stderr, 'write')
    .mockImplementation((chunk: unknown) => {
      stderrChunks.push(String(chunk));
      return true;
    });

  try {
    await captureJsonOutput(async () => {
      await checkCommand.run?.({
        args: { annotations: true, cwd, json: true },
      } as never);
    });

    // Annotations must not pollute the machine-readable stdout stream
    expect(stdoutChunks.join('')).not.toContain('::');
    // Annotations are emitted on stderr (parsed by the Actions runner)
    expect(stderrChunks.join('')).toContain('::error');
  } finally {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    process.exitCode = 0;
    await fs.rm(cwd, { force: true, recursive: true });
  }
});

it('check --badge - --json keeps stdout a valid JSON payload', async () => {
  const cwd = await createProjectFixture();
  const stdoutChunks: Array<string> = [];
  const stderrChunks: Array<string> = [];
  const stdoutSpy = vi
    .spyOn(process.stdout, 'write')
    .mockImplementation((chunk: unknown) => {
      stdoutChunks.push(String(chunk));
      return true;
    });
  const stderrSpy = vi
    .spyOn(process.stderr, 'write')
    .mockImplementation((chunk: unknown) => {
      stderrChunks.push(String(chunk));
      return true;
    });

  try {
    const output = await captureJsonOutput(async () => {
      await checkCommand.run?.({
        args: { badge: '-', cwd, json: true },
      } as never);
    });

    // The badge SVG must not pollute the machine-readable stdout stream
    expect(stdoutChunks.join('')).not.toContain('<svg');
    // The badge SVG is emitted on stderr alongside annotations
    expect(stderrChunks.join('')).toContain('<svg');
    expect(typeof output).toBe('object');
  } finally {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    process.exitCode = 0;
    await fs.rm(cwd, { force: true, recursive: true });
  }
});

it('check --badge <file> --json writes the badge and keeps stdout a valid JSON payload', async () => {
  const cwd = await createProjectFixture();
  const badgePath = path.join(cwd, 'conformance.svg');
  const stdoutChunks: Array<string> = [];
  const stdoutSpy = vi
    .spyOn(process.stdout, 'write')
    .mockImplementation((chunk: unknown) => {
      stdoutChunks.push(String(chunk));
      return true;
    });

  try {
    const output = await captureJsonOutput(async () => {
      await checkCommand.run?.({
        args: { badge: badgePath, cwd, json: true },
      } as never);
    });

    // The "Badge written" success message must not break the JSON payload
    expect(stdoutChunks.join('')).not.toContain('Badge written');
    expect(typeof output).toBe('object');

    const svg = await fs.readFile(badgePath, 'utf-8');
    expect(svg).toContain('<svg');
  } finally {
    stdoutSpy.mockRestore();
    process.exitCode = 0;
    await fs.rm(cwd, { force: true, recursive: true });
  }
});

it('check --badge - keeps stdout a clean SVG and routes the audit to stderr', async () => {
  const cwd = await createProjectFixture();
  const stdoutChunks: Array<string> = [];
  const stderrChunks: Array<string> = [];
  const stdoutSpy = vi
    .spyOn(process.stdout, 'write')
    .mockImplementation((chunk: unknown) => {
      stdoutChunks.push(String(chunk));
      return true;
    });
  const stderrSpy = vi
    .spyOn(process.stderr, 'write')
    .mockImplementation((chunk: unknown) => {
      stderrChunks.push(String(chunk));
      return true;
    });

  try {
    await checkCommand.run?.({
      args: { badge: '-', cwd },
    } as never);

    const stdout = stdoutChunks.join('');
    const stderr = stderrChunks.join('');
    expect(stdout.startsWith('<svg')).toBe(true);
    // Nothing may follow the SVG on stdout - the audit goes to stderr.
    expect(stdout.endsWith('</svg>')).toBe(true);
    expect(stdout).not.toContain('Conformance audit');
    // In CI, quiet mode is auto-enabled so the audit section is skipped and
    // only the summary line is printed - but it must land on stderr, never
    // after the SVG on stdout.
    expect(stderr).toMatch(CONFORMANCE_SUMMARY_REGEX);
  } finally {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    process.exitCode = 0;
    await fs.rm(cwd, { force: true, recursive: true });
  }
});
