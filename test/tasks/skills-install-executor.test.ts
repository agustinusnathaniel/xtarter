import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  type CommandResult,
  detectProject,
  ProcessRunner,
} from '@xtarterize/core';
import { skillsInstallTask } from '@xtarterize/tasks';
import { Duration, Effect, Layer } from 'effect';
import { beforeEach, describe, expect, vi } from 'vite-plus/test';

import { resolveSkillsExecutor } from '../../packages/tasks/src/agent/skills-install.js';
import { runWith } from '../helpers/run.js';

// npm 11 rejects `npx` when `devEngines.packageManager` names another package
// manager, so each detected manager must select its own dlx executor.
const { mockRun } = vi.hoisted(() => ({
  mockRun: vi.fn(),
}));

const runnerLayer = Layer.succeed(ProcessRunner, {
  run: (command, args, options) =>
    Effect.sync(() => {
      mockRun(command, args, options);
      return { exitCode: 0, stderr: '', stdout: '' } satisfies CommandResult;
    }),
});

interface ExecutorCase {
  expectedCommand: string;
  expectedPrefix: ReadonlyArray<string>;
  lockfile: string;
  name: string;
  packageManager: string;
  yarnrc: boolean;
}

const executorCases: ReadonlyArray<ExecutorCase> = [
  {
    expectedCommand: 'npx',
    expectedPrefix: ['--yes', 'skills@latest'],
    lockfile: 'package-lock.json',
    name: 'npm',
    packageManager: 'npm',
    yarnrc: false,
  },
  {
    expectedCommand: 'pnpm',
    expectedPrefix: ['dlx', 'skills@latest'],
    lockfile: 'pnpm-lock.yaml',
    name: 'pnpm',
    packageManager: 'pnpm',
    yarnrc: false,
  },
  {
    expectedCommand: 'yarn',
    expectedPrefix: ['dlx', 'skills@latest'],
    lockfile: 'yarn.lock',
    name: 'yarn berry',
    packageManager: 'yarn',
    yarnrc: true,
  },
  {
    expectedCommand: 'npx',
    expectedPrefix: ['--yes', 'skills@latest'],
    lockfile: 'yarn.lock',
    name: 'yarn classic',
    packageManager: 'yarn',
    yarnrc: false,
  },
  {
    expectedCommand: 'bunx',
    expectedPrefix: ['skills@latest'],
    lockfile: 'bun.lock',
    name: 'bun',
    packageManager: 'bun',
    yarnrc: false,
  },
];

async function createSkillsProject(options: {
  lockfile: string;
  yarnrc: boolean;
}): Promise<string> {
  const tmpDir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'xtarterize-skills-executor-')
  );

  await fs.writeFile(
    path.join(tmpDir, 'package.json'),
    JSON.stringify(
      {
        dependencies: { react: '^19.0.0' },
        devDependencies: {
          typescript: '^5.8.0',
          vite: '^7.0.0',
        },
        name: 'skills-executor-fixture',
        private: true,
        type: 'module',
      },
      null,
      2
    )
  );
  await fs.writeFile(
    path.join(tmpDir, 'tsconfig.json'),
    JSON.stringify({ compilerOptions: { target: 'ES2022' } }, null, 2)
  );
  await fs.writeFile(path.join(tmpDir, options.lockfile), '');
  if (options.yarnrc) {
    await fs.writeFile(
      path.join(tmpDir, '.yarnrc.yml'),
      'nodeLinker: node-modules\n'
    );
  }

  return tmpDir;
}

beforeEach(() => {
  mockRun.mockReset();
});

describe('resolveSkillsExecutor', () => {
  test('maps each package manager to its dlx executor', () => {
    expect(resolveSkillsExecutor('npm', { yarnBerry: false })).toEqual({
      command: 'npx',
      prefixArgs: ['--yes', 'skills@latest'],
    });
    expect(resolveSkillsExecutor('pnpm', { yarnBerry: false })).toEqual({
      command: 'pnpm',
      prefixArgs: ['dlx', 'skills@latest'],
    });
    expect(resolveSkillsExecutor('yarn', { yarnBerry: true })).toEqual({
      command: 'yarn',
      prefixArgs: ['dlx', 'skills@latest'],
    });
    expect(resolveSkillsExecutor('yarn', { yarnBerry: false })).toEqual({
      command: 'npx',
      prefixArgs: ['--yes', 'skills@latest'],
    });
    expect(resolveSkillsExecutor('bun', { yarnBerry: false })).toEqual({
      command: 'bunx',
      prefixArgs: ['skills@latest'],
    });
  });
});

describe('skillsInstallTask executor selection', () => {
  for (const executorCase of executorCases) {
    test(`runs the skills CLI through ${executorCase.name}`, async () => {
      const tmpDir = await createSkillsProject(executorCase);

      try {
        const profile = await detectProject(tmpDir);
        expect(profile.packageManager).toBe(executorCase.packageManager);

        await runWith(runnerLayer, skillsInstallTask.apply(tmpDir, profile));

        expect(mockRun).toHaveBeenCalled();
        const callArgs = mockRun.mock.calls[0];
        expect(callArgs[0]).toBe(executorCase.expectedCommand);
        expect(
          callArgs[1].slice(0, executorCase.expectedPrefix.length + 1)
        ).toEqual([...executorCase.expectedPrefix, 'add']);
        expect(callArgs[2]).toMatchObject({
          cwd: tmpDir,
          stdio: 'inherit',
          timeout: Duration.millis(60_000),
        });
      } finally {
        await fs.rm(tmpDir, { force: true, recursive: true });
      }
    });
  }
});
