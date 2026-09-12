/**
 * Regression coverage for the CLI's SIGINT exit contract.
 *
 * Justification for a dedicated spawned-bin suite: the contract spans
 * process-level seams that in-process tests cannot exercise, the real OS
 * signal handler in apps/xtarterize/src/index.ts, the 250 ms unref'd grace
 * timer, and the real clack prompt that holds the event loop open.
 * test/integration/runtime.test.ts covers only abortCliProgram()'s
 * in-process resolution contract; it never delivers a signal, never observes
 * a process exit, and never runs the timer. No existing suite spawns the
 * built xtarterize CLI.
 *
 * The failure this distinguishes: a regression where SIGINT during a pending
 * prompt makes the process die from the signal (exit code null) or wait far
 * past the grace deadline instead of exiting 0. The bound is deliberately
 * generous (observed 255-291 ms locally) and no lower bound is asserted,
 * because exiting immediately is also valid.
 */
import { type ChildProcess, execFile, spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { describe, expect, test } from 'vite-plus/test';

import { withTempDir } from '../helpers/temp.js';

const execFileAsync = promisify(execFile);

const CLI_ENTRY = fileURLToPath(
  new URL('../../apps/xtarterize/dist/index.mjs', import.meta.url)
);

/** Plain text of init's selection dialog; ANSI framing is irrelevant. */
const PROMPT_MARKER = 'How would you like to proceed?';

/** Generous bounds: local prompt appears in ~240 ms and exit takes ~255 ms. */
const PROMPT_WAIT_TIMEOUT_MS = 10_000;
const EXIT_AFTER_SIGINT_BOUND_MS = 2500;
const TEST_TIMEOUT_MS = 30_000;
const KILL_WAIT_TIMEOUT_MS = 2000;

async function setupMinimalProject(projectDir: string): Promise<void> {
  await fs.writeFile(
    path.join(projectDir, 'package.json'),
    JSON.stringify({
      dependencies: { react: '^18.2.0' },
      devDependencies: { typescript: '^5.0.0', vite: '^5.0.0' },
      name: 'sigint-test-fixture',
      type: 'module',
      version: '1.0.0',
    })
  );
  await execFileAsync('git', ['init', '-q'], { cwd: projectDir });
}

function spawnInit(cwd: string) {
  const env = { ...process.env, NO_COLOR: '1' };
  // Clack's isCI() forces quiet mode, which would skip the prompt entirely;
  // an undefined entry is omitted from the spawned environment.
  env.CI = undefined;
  const child = spawn(process.execPath, [CLI_ENTRY, 'init'], {
    cwd,
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const { stderr, stdout } = child;
  if (!(stdout && stderr)) {
    child.kill('SIGKILL');
    throw new Error('Expected piped stdio for the spawned CLI');
  }
  let output = '';
  let errors = '';
  stdout.setEncoding('utf8');
  stdout.on('data', (chunk: string) => {
    output += chunk;
  });
  stderr.setEncoding('utf8');
  stderr.on('data', (chunk: string) => {
    errors += chunk;
  });
  return {
    child,
    errorsText: () => errors,
    outputText: () => output,
    stderr,
    stdout,
  };
}

type SpawnedInit = ReturnType<typeof spawnInit>;

function waitForPrompt(spawned: SpawnedInit, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(onTimeout, timeoutMs);

    function cleanup(): void {
      clearTimeout(timer);
      spawned.stdout.off('data', check);
      spawned.child.off('exit', onExit);
      spawned.child.off('error', onError);
    }

    function check(): void {
      if (!spawned.outputText().includes(PROMPT_MARKER)) {
        return;
      }
      cleanup();
      resolve();
    }

    function onTimeout(): void {
      cleanup();
      reject(
        new Error(
          `Timed out after ${timeoutMs}ms waiting for "${PROMPT_MARKER}"\nstdout:\n${spawned.outputText()}\nstderr:\n${spawned.errorsText()}`
        )
      );
    }

    function onExit(code: number | null, signal: NodeJS.Signals | null): void {
      cleanup();
      reject(
        new Error(
          `CLI exited before showing the prompt (code=${String(code)}, signal=${String(signal)})\nstdout:\n${spawned.outputText()}\nstderr:\n${spawned.errorsText()}`
        )
      );
    }

    function onError(error: Error): void {
      cleanup();
      reject(error);
    }

    if (spawned.child.exitCode !== null || spawned.child.signalCode !== null) {
      onExit(spawned.child.exitCode, spawned.child.signalCode);
      return;
    }
    spawned.stdout.on('data', check);
    spawned.child.on('exit', onExit);
    spawned.child.on('error', onError);
    check();
  });
}

function waitForExit(child: ChildProcess): Promise<{
  code: number | null;
  signal: NodeJS.Signals | null;
}> {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve({ code: child.exitCode, signal: child.signalCode });
  }
  return new Promise((resolve) => {
    child.once('exit', (code, signal) => resolve({ code, signal }));
  });
}

/** Never leave a hung process behind. */
async function stopChildProcess(
  spawned: SpawnedInit | undefined
): Promise<void> {
  if (
    spawned &&
    spawned.child.exitCode === null &&
    spawned.child.signalCode === null
  ) {
    spawned.child.kill('SIGKILL');
    await Promise.race([
      waitForExit(spawned.child),
      delay(KILL_WAIT_TIMEOUT_MS),
    ]);
  }
}

describe('cli SIGINT contract', () => {
  test(
    'exits 0 shortly after SIGINT interrupts an interactive prompt',
    async () => {
      await withTempDir('xtarterize-sigint-', async (projectDir) => {
        await setupMinimalProject(projectDir);
        const spawned = spawnInit(projectDir);
        try {
          await waitForPrompt(spawned, PROMPT_WAIT_TIMEOUT_MS);

          const signalSentAt = Date.now();
          const delivered = spawned.child.kill('SIGINT');
          expect(
            delivered,
            'CLI process must still be alive to receive SIGINT'
          ).toBe(true);

          const { code, signal } = await waitForExit(spawned.child);
          const elapsed = Date.now() - signalSentAt;
          expect(
            signal,
            `CLI must exit normally instead of dying from the signal\nstdout:\n${spawned.outputText()}\nstderr:\n${spawned.errorsText()}`
          ).toBeNull();
          expect(code, `Expected exit code 0, received ${String(code)}`).toBe(
            0
          );
          expect(
            elapsed,
            `CLI took ${elapsed}ms to exit after SIGINT (bound ${EXIT_AFTER_SIGINT_BOUND_MS}ms)`
          ).toBeLessThanOrEqual(EXIT_AFTER_SIGINT_BOUND_MS);
        } finally {
          await stopChildProcess(spawned);
        }
      });
    },
    TEST_TIMEOUT_MS
  );
});
