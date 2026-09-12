import { detectProject } from '@xtarterize/core';
import { skillsInstallTask } from '@xtarterize/tasks';
import { Duration } from 'effect';
import { beforeEach, describe, expect } from 'vite-plus/test';

import { resolveSkillsExecutor } from '../../packages/tasks/src/agent/skills-install.js';
import { recordingProcessRunner, runWith } from '../helpers/run.js';
import { withSkillsProject } from '../helpers/skills-project.js';

// npm 11 rejects `npx` when `devEngines.packageManager` names another package
// manager, so each detected manager must select its own dlx executor.
const runner = recordingProcessRunner();

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

beforeEach(() => {
  runner.reset();
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
      await withSkillsProject(
        {
          lockfile: executorCase.lockfile,
          yarnrc: executorCase.yarnrc,
        },
        async (tmpDir) => {
          const profile = await detectProject(tmpDir);
          expect(profile.packageManager).toBe(executorCase.packageManager);

          await runWith(runner.layer, skillsInstallTask.apply(tmpDir, profile));

          expect(runner.calls.length).toBeGreaterThan(0);
          const callArgs = runner.calls[0];
          expect(callArgs[0]).toBe(executorCase.expectedCommand);
          expect(
            callArgs[1].slice(0, executorCase.expectedPrefix.length + 1)
          ).toEqual([...executorCase.expectedPrefix, 'add']);
          expect(callArgs[2]).toMatchObject({
            cwd: tmpDir,
            stdio: 'inherit',
            timeout: Duration.millis(60_000),
          });
        }
      );
    });
  }
});
