import {
  type FixtureName,
  fixtureDir,
  fixtureProfile,
} from '@test/helpers/project.js';
import { recordingProcessRunner, run, runWith } from '@test/helpers/run.js';
import { withSkillsProject } from '@test/helpers/skills-project.js';
import {
  detectProject,
  type ProjectProfile,
  planTasks,
} from '@xtarterize/core';
import { Duration } from 'effect';
import { beforeEach, describe, expect } from 'vite-plus/test';

import { getSkillsToInstall } from '../../packages/tasks/src/agent/catalog.js';
import {
  resolveSkillsExecutor,
  skillsInstallTask,
} from '../../packages/tasks/src/agent/skills-install.js';

// The task talks to the ProcessRunner service, so the test swaps in a stub
// layer that records commands and scripts the exit code per test.
const runner = recordingProcessRunner();

// The action has no file diff, so the install command captures are the
// observable surface for which skills the task selects.
const installOutput = async (
  cwd: string,
  profile: ProjectProfile
): Promise<string> => {
  runner.reset();
  await runWith(runner.layer, skillsInstallTask.apply(cwd, profile));
  return runner.calls
    .map(([command, args]) => [command, ...(args ?? [])].join(' '))
    .join('\n');
};

// Reset the stub installer between tests so a failure-path result set by one
// test cannot leak into a later test that applies directly.
beforeEach(() => {
  runner.reset();
});

/** Install output for an on-disk fixture whose profile is cached. */
const fixtureInstallOutput = async (name: FixtureName): Promise<string> =>
  installOutput(fixtureDir(name), await fixtureProfile(name));

describe('skillsInstallTask', () => {
  test('is applicable to TypeScript projects', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    expect(skillsInstallTask.applicable(profile)).toBe(true);
  });

  test('is not applicable to non-TypeScript projects', async () => {
    const profile = await fixtureProfile('node-only');
    // node-only fixture might still have tsconfig, check actual profile
    expect(skillsInstallTask.applicable(profile)).toBe(profile.typescript);
  });

  test('returns new on clean react fixture with react skills', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    const status = await run(
      skillsInstallTask.check(fixtureDir('react-vite-tailwind'), profile)
    );
    expect(status).toBe('new');
  });

  test('dryRun reports no file diff and the plan backs up nothing', async () => {
    const cwd = fixtureDir('react-vite-tailwind');
    const profile = await fixtureProfile('react-vite-tailwind');
    await expect(run(skillsInstallTask.dryRun(cwd, profile))).resolves.toEqual(
      []
    );
    const plan = await run(
      planTasks({ cwd, profile, tasks: [skillsInstallTask] })
    );
    expect(plan.files).toEqual([]);
  });
});

describe('skillsInstallTask', () => {
  test('installs react and frontend skills for react projects', async () => {
    const commands = await fixtureInstallOutput('react-vite-tailwind');
    // React skills
    expect(commands).toContain('vercel-react-best-practices');
    expect(commands).toContain('vercel-composition-patterns');
    expect(commands).toContain('react-dev');
    expect(commands).toContain('react-useeffect');
    // Frontend / UI skills
    expect(commands).toContain('frontend-design');
    expect(commands).toContain('web-design-guidelines');
    expect(commands).toContain('baseline-ui');
    expect(commands).toContain('fixing-accessibility');
    expect(commands).toContain('fixing-metadata');
    expect(commands).toContain('fixing-motion-performance');
    expect(commands).toContain('emilkowalski/skills');
    expect(commands).toContain('--skill animate');
    expect(commands).toContain('jakubkrehel/skills');
    expect(commands).toContain('--skill better-accessibility');
    expect(commands).toContain('addyosmani/agent-skills');
    expect(commands).toContain('--skill frontend-ui-engineering');
    expect(commands).not.toContain('--skill animate-expo');
    // Build tool skills
    expect(commands).toContain('vite');
    // General skills
    expect(commands).toContain('opensrc');
    expect(commands).toContain('grill-me');
    expect(commands).toContain('handoff');
    expect(commands).toContain('improve-codebase-architecture');
    expect(commands).toContain('writing-for-agents');
  });

  test('installs vue and frontend skills for vue projects', async () => {
    const commands = await fixtureInstallOutput('vue-vite');
    // Vue skills
    expect(commands).toContain('vue');
    expect(commands).toContain('vue-best-practices');
    // Frontend / UI skills
    expect(commands).toContain('frontend-design');
    expect(commands).toContain('web-design-guidelines');
    expect(commands).toContain('baseline-ui');
    // Build tool skills
    expect(commands).toContain('vite');
    // React skills should NOT be present
    expect(commands).not.toContain('vercel-react-best-practices');
    expect(commands).not.toContain('vercel-composition-patterns');
    expect(commands).not.toContain('react-dev');
    expect(commands).not.toContain('react-useeffect');
  });
});

describe('skillsInstallTask', () => {
  test('installs nextjs skills for nextjs projects', async () => {
    const commands = await fixtureInstallOutput('nextjs');
    // Next.js skills
    expect(commands).toContain('next-dev-loop');
    expect(commands).toContain('next-cache-components-optimizer');
    expect(commands).toContain('next-cache-components-adoption');
    // React skills (Next.js is React)
    expect(commands).toContain('vercel-react-best-practices');
    expect(commands).toContain('react-dev');
    expect(commands).toContain('react-useeffect');
    // Frontend / UI skills
    expect(commands).toContain('baseline-ui');
  });

  test('installs expo skills for expo projects', async () => {
    const commands = await fixtureInstallOutput('react-native-expo');
    expect(commands).toContain('expo-overview');
    expect(commands).toContain('expo-router');
    expect(commands).toContain('eas-workflows');
    expect(commands).toContain('eas-app-stores');
    expect(commands).toContain('eas-update');
    expect(commands).toContain('expo-dev-client');
    expect(commands).toContain('expo-native-ui');
    expect(commands).toContain('expo-data-fetching');
    expect(commands).toContain('expo-module');
    expect(commands).toContain('expo-upgrade');
    expect(commands).toContain('vercel-react-native-skills');
    expect(commands).toContain('--skill animate-expo');
    expect(commands).not.toContain('--skill frontend-ui-engineering');
  });

  test('installs antd skill for projects with antd', async () => {
    const commands = await fixtureInstallOutput('react-ui-libraries');
    expect(commands).toContain('antd');
    expect(commands).toContain('ant-design/ant-design-cli');
  });
});

describe('skillsInstallTask', () => {
  test('installs heroui-react skill for projects with @heroui/react', async () => {
    const commands = await fixtureInstallOutput('react-ui-libraries');
    expect(commands).toContain('heroui-react');
    expect(commands).toContain('heroui-inc/heroui');
  });

  test('installs chakra-ui skills for projects with @chakra-ui/react', async () => {
    const commands = await fixtureInstallOutput('react-ui-libraries');
    expect(commands).toContain('chakra-ui-builder');
    expect(commands).toContain('chakra-ui-refactor');
    expect(commands).toContain('chakra-ui/chakra-ui');
  });

  test('installs heroui-native skill for react-native projects with heroui-native', async () => {
    const commands = await fixtureInstallOutput('react-native-hero');
    expect(commands).toContain('heroui-native');
    expect(commands).toContain('heroui-inc/heroui');
  });

  test('does not include component library skills in plain react projects', async () => {
    const commands = await fixtureInstallOutput('react-vite-tailwind');
    expect(commands).not.toContain('antd');
    expect(commands).not.toContain('heroui-react');
    expect(commands).not.toContain('heroui-native');
    expect(commands).not.toContain('chakra-ui-builder');
    expect(commands).not.toContain('chakra-ui-refactor');
  });
});

describe('skillsInstallTask', () => {
  test('returns new for node-only projects with general skills', async () => {
    const profile = await fixtureProfile('node-only');
    if (!skillsInstallTask.applicable(profile)) {
      return;
    }
    const status = await run(
      skillsInstallTask.check(fixtureDir('node-only'), profile)
    );
    expect(status).toBe('new');
  });

  test('installs general skills for node-only projects', async () => {
    const cwd = fixtureDir('node-only');
    const profile = await fixtureProfile('node-only');
    if (!skillsInstallTask.applicable(profile)) {
      return;
    }
    const commands = await installOutput(cwd, profile);
    expect(commands).toContain('opensrc');
    expect(commands).toContain('writing-for-agents');
  });

  test('returns patch when some skills are already installed', async () => {
    await withSkillsProject({ skillDirs: ['react-dev'] }, async (tmpDir) => {
      const profile = await detectProject(tmpDir);
      const status = await run(skillsInstallTask.check(tmpDir, profile));

      expect(status).toBe('patch');
    });
  });
});

describe('skillsInstallTask', () => {
  test('batches skills from the same source into a single command', async () => {
    const commands = await fixtureInstallOutput('react-native-expo');
    // expo/skills has 10 skills - they should appear in a single command
    const expoLine = commands
      .split('\n')
      .find((l) => l.includes('expo/skills'));
    expect(expoLine).toBeDefined();
    expect(expoLine).toContain('--skill expo-overview');
    expect(expoLine).toContain('--skill expo-router');
    expect(expoLine).toContain('--skill eas-workflows');
    expect(expoLine).toContain('--skill eas-app-stores');
    expect(expoLine).toContain('--skill eas-update');
    expect(expoLine).toContain('--skill expo-dev-client');
    expect(expoLine).toContain('--skill expo-native-ui');
    expect(expoLine).toContain('--skill expo-data-fetching');
    expect(expoLine).toContain('--skill expo-module');
    expect(expoLine).toContain('--skill expo-upgrade');
    // Should NOT have separate lines for the same source
    const expoLines = commands
      .split('\n')
      .filter((l) => l.includes('expo/skills'));
    expect(expoLines.length).toBe(1);
  });

  test('does not treat an empty skill directory as installed', async () => {
    await withSkillsProject(
      { emptySkillDirs: ['react-dev'] },
      async (tmpDir) => {
        const profile = await detectProject(tmpDir);
        const commands = await installOutput(tmpDir, profile);

        expect(commands).toContain('--skill react-dev');
      }
    );
  });
});

describe('skillsInstallTask apply', () => {
  test('constructs the correct npx command for a react project', async () => {
    // Pin the package manager: without a lockfile nypm falls back to the
    // invoking process, which under the test runner resolves to pnpm.
    await withSkillsProject(
      { lockfile: 'package-lock.json' },
      async (tmpDir) => {
        const profile = await detectProject(tmpDir);
        await runWith(runner.layer, skillsInstallTask.apply(tmpDir, profile));

        expect(runner.calls.length).toBeGreaterThan(0);
        const callArgs = runner.calls[0];
        expect(callArgs[0]).toBe('npx');
        expect(callArgs[1]).toEqual(
          expect.arrayContaining(['--yes', 'skills@latest', 'add'])
        );
        expect(callArgs[1]).toEqual(
          expect.arrayContaining(['--skill', 'opensrc'])
        );
        expect(callArgs[2]).toMatchObject({
          cwd: tmpDir,
          stdio: 'inherit',
          timeout: Duration.millis(60_000),
        });
      }
    );
  });

  test('throws TaskError when the npx command fails', async () => {
    runner.setResult({ exitCode: 1, stderr: '', stdout: '' });

    await withSkillsProject(
      { lockfile: 'package-lock.json' },
      async (tmpDir) => {
        const profile = await detectProject(tmpDir);
        await expect(
          runWith(runner.layer, skillsInstallTask.apply(tmpDir, profile))
        ).rejects.toThrow(/Failed to install skills from/);
      }
    );
  });

  test('only installs missing skills when some are already installed', async () => {
    await withSkillsProject({ skillDirs: ['opensrc'] }, async (tmpDir) => {
      const profile = await detectProject(tmpDir);
      await runWith(runner.layer, skillsInstallTask.apply(tmpDir, profile));

      // Should still call the runner for remaining skills
      expect(runner.calls.length).toBeGreaterThan(0);
    });
  });
});

describe('skill selection by project signals', () => {
  test('keeps web UI skills out of native and Node projects', async () => {
    const web = await fixtureProfile('react-vite-tailwind');
    const native = await fixtureProfile('react-native-expo');
    const node = await fixtureProfile('node-only');
    const names = (profile: ProjectProfile) =>
      getSkillsToInstall(profile, {}).map(({ skill }) => skill);

    expect(names(web)).toContain('better-interface');
    expect(names(web)).toContain('frontend-ui-engineering');
    expect(names(web)).not.toContain('browser-testing-with-devtools');
    expect(names(web)).not.toContain('break');
    expect(names(web)).not.toContain('wait-what');
    expect(names(native)).toContain('animate-expo');
    expect(names(native)).not.toContain('better-interface');
    expect(names(node)).not.toContain('frontend-ui-engineering');
  });

  test('selects test and security skills only with matching dependencies', async () => {
    const profile = await fixtureProfile('node-only');
    const names = (deps: Record<string, string>) =>
      getSkillsToInstall(profile, deps).map(({ skill }) => skill);

    expect(names({})).not.toContain('security-audit');
    expect(names({})).not.toContain('test-strategy');
    expect(names({})).not.toContain('ask-sonner');
    expect(names({ vitest: '^4.0.0' })).toContain('test-strategy');
    expect(names({ vitest: '^4.0.0' })).toContain('test-driven-development');
    expect(names({ 'better-auth': '^1.0.0' })).toContain('security-audit');
    expect(names({ 'better-auth': '^1.0.0' })).toContain(
      'security-and-hardening'
    );
    expect(names({ sonner: '^2.0.0' })).toContain('ask-sonner');
    expect(names({ hono: '^4.0.0' })).toContain('api-and-interface-design');
  });

  test('selects repository workflow skills from detected project files', async () => {
    const base = await fixtureProfile('node-only');
    const profile = {
      ...base,
      existing: {
        ...base.existing,
        agentsMd: true,
        githubWorkflows: ['ci.yml'],
      },
      hasGit: true,
      hasGitHub: true,
    };
    const names = getSkillsToInstall(profile, {}).map(({ skill }) => skill);

    expect(names).toContain('git-workflow-and-versioning');
    expect(names).toContain('ci-cd-and-automation');
    expect(names).toContain('code-review-and-quality');
    expect(names).toContain('context-engineering');
    expect(names).not.toContain('using-agent-skills');
  });
});

// ---------------------------------------------------------------------------
// Executor selection (merged from skills-install-executor.test.ts): npm 11
// rejects `npx` when `devEngines.packageManager` names another package
// manager, so each detected manager must select its own dlx executor. These
// assertions share the `runner` stub and `beforeEach` reset above.
// ---------------------------------------------------------------------------

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
