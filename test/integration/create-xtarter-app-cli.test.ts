/**
 * Regression tests for the create-xtarter-app CLI entrypoint dispatch.
 *
 * Justification for a dedicated spawned-bin suite: citty 0.2 changed its
 * subcommand dispatch to reject any unmatched first positional, which broke
 * the documented primary flow (`create-xtarter-app my-app`) and shipped to
 * npm in v1.15.2 without any suite noticing. Only executing the built bin
 * can observe the entrypoint's dispatch contract; no existing suite covers
 * this CLI. Assertions avoid network dependence: the download-failure probe
 * fails identically online (404) and offline (connection error), and both
 * failures are distinct from the regression signature ("Unknown command").
 */
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { describe, expect, test } from 'vite-plus/test';

const execFileAsync = promisify(execFile);
const CLI_ENTRY = fileURLToPath(
  new URL('../../apps/create-xtarter-app/dist/cli.mjs', import.meta.url)
);

interface CliRunResult {
  code: number | null;
  output: string;
}

async function runCli(
  rawArgs: Array<string>,
  cwd?: string
): Promise<CliRunResult> {
  const workDir =
    cwd ?? (await fs.mkdtemp(path.join(os.tmpdir(), 'cxa-cli-test-')));
  try {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      [CLI_ENTRY, ...rawArgs],
      {
        cwd: workDir,
        killSignal: 'SIGKILL',
        // Non-interactive contract: the CLI must never wait on stdin.
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 12_000,
      }
    );
    return { code: 0, output: `${stdout}${stderr}` };
  } catch (error) {
    const failure = error as {
      code?: number | null;
      killed?: boolean;
      stderr?: string;
      stdout?: string;
    };
    // Timeouts are acceptable for probes that enter the scaffold flow:
    // reaching it at all is the contract under test.
    return {
      code: failure.killed ? null : (failure.code ?? null),
      output: `${failure.stdout ?? ''}${failure.stderr ?? ''}`,
    };
  } finally {
    if (!cwd) {
      await fs.rm(workDir, { force: true, recursive: true });
    }
  }
}

describe('create-xtarter-app cli dispatch', () => {
  test('dispatches positional project names to the scaffold flow', async () => {
    const { output } = await runCli([
      'probe-name',
      '--yes',
      '--quiet',
      '--no-git',
      '--ref',
      'definitely-not-a-real-ref',
    ]);
    expect(output).not.toContain('Unknown command');
    expect(output).not.toContain('USAGE');
  });

  test('keeps the preview subcommand working', async () => {
    const { code, output } = await runCli(['preview', 'next-chakra']);
    expect(code).toBe(0);
    expect(output).toContain('next-chakra');
  });

  test('keeps preview discoverable in top-level help', async () => {
    const { code, output } = await runCli(['--help']);
    expect(code).toBe(0);
    expect(output).toContain('preview');
  });

  test('rejects unknown options with a suggestion', async () => {
    const { code, output } = await runCli([
      'probe-name',
      '--definitely-not-a-flag',
    ]);
    expect(code).toBe(1);
    expect(output).toContain('Unknown option --definitely-not-a-flag');
  });

  test('rejects unknown options on the preview subcommand', async () => {
    const { code, output } = await runCli(['preview', '--json']);
    expect(code).toBe(1);
    expect(output).toContain(
      'Unknown option --json for "create-xtarter-app preview"'
    );
  });
});

describe('create-xtarter-app input validation', () => {
  async function probeInvalidFlag(flags: Array<string>): Promise<{
    code: number | null;
    markerExists: boolean;
    output: string;
  }> {
    const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'cxa-cli-validation-'));
    const target = path.join(cwd, 'existing');
    const marker = path.join(target, 'keep-me.txt');
    await fs.mkdir(target, { recursive: true });
    await fs.writeFile(marker, 'keep');
    try {
      const { code, output } = await runCli(
        ['existing', '--force', '--yes', '--quiet', ...flags],
        cwd
      );
      let markerExists = true;
      try {
        await fs.access(marker);
      } catch {
        markerExists = false;
      }
      return { code, markerExists, output };
    } finally {
      await fs.rm(cwd, { force: true, recursive: true });
    }
  }

  test('keeps an existing directory when --template is invalid', async () => {
    const { code, markerExists, output } = await probeInvalidFlag([
      '--template',
      'not-a-template',
    ]);
    expect(code).toBe(1);
    expect(output).toContain('Unknown template "not-a-template"');
    expect(markerExists).toBe(true);
  });

  test('keeps an existing directory when --pm is invalid', async () => {
    const { code, markerExists, output } = await probeInvalidFlag([
      '--pm',
      'not-a-pm',
    ]);
    expect(code).toBe(1);
    expect(output).toContain('Unknown package manager "not-a-pm"');
    expect(markerExists).toBe(true);
  });
});
