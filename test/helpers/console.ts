import { expect, vi } from 'vite-plus/test';

/** Captured console lines plus the callback's resolved value. */
export interface ConsoleCapture<Result> {
  logs: Array<string>;
  result: Result;
}

/**
 * Capture `console.log` lines emitted while `fn` runs, restoring the original
 * in `finally`. Lines are joined the way every suite captured them: one line
 * per call, arguments stringified and joined with a space.
 */
export async function captureConsole<Result>(
  fn: () => Result | Promise<Result>
): Promise<ConsoleCapture<Result>> {
  const logs: Array<string> = [];
  const originalLog = console.log;
  console.log = (...args: Array<unknown>) => {
    logs.push(args.map((arg) => String(arg)).join(' '));
  };

  try {
    return { logs, result: await fn() };
  } finally {
    console.log = originalLog;
  }
}

/**
 * Parse the machine-readable payload `fn` prints on stdout. The contract: at
 * least one line is logged and the JSON payload is the FIRST one, with no
 * leading blank line or human text ahead of it for CI consumers.
 */
export async function captureJson(
  fn: () => unknown | Promise<unknown>
): Promise<unknown> {
  const { logs } = await captureConsole(fn);
  expect(logs.length).toBeGreaterThan(0);
  const payload = logs.find((line) => line.trim().startsWith('{'));
  expect(payload).toBe(logs[0]);
  return JSON.parse(payload ?? '');
}

/** Captured stdout/stderr chunks plus the callback's resolved value. */
export interface StreamCapture<Result> {
  result: Result;
  stderr: Array<string>;
  stdout: Array<string>;
}

/**
 * Capture raw `process.stdout`/`process.stderr` writes while `fn` runs,
 * restoring both spies in `finally`.
 */
export async function captureStreams<Result>(
  fn: () => Result | Promise<Result>
): Promise<StreamCapture<Result>> {
  const stdout: Array<string> = [];
  const stderr: Array<string> = [];
  const stdoutSpy = vi
    .spyOn(process.stdout, 'write')
    .mockImplementation((chunk: unknown) => {
      stdout.push(String(chunk));
      return true;
    });
  const stderrSpy = vi
    .spyOn(process.stderr, 'write')
    .mockImplementation((chunk: unknown) => {
      stderr.push(String(chunk));
      return true;
    });

  try {
    return { result: await fn(), stderr, stdout };
  } finally {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
  }
}
