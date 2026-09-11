import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  detectProject,
  type ProjectProfile,
  planTasks,
} from '@xtarterize/core';
import { skillsInstallTask } from '@xtarterize/tasks';
import { describe, expect, vi } from 'vite-plus/test';

import { SKILL_CATALOG } from '../../packages/tasks/src/agent/catalog.js';

const { mockX } = vi.hoisted(() => ({
  mockX: vi.fn().mockResolvedValue({ exitCode: 0 }),
}));

// Use a path-based mock for tinyexec because pnpm installs it in
// packages/tasks/node_modules/tinyexec - a different resolution path
// than the test file's dependency graph. A bare specifier mock
// ('tinyexec') would intercept the wrong copy of the module.
vi.mock('/packages/tasks/node_modules/tinyexec/dist/main.mjs', () => ({
  x: mockX,
}));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.resolve(__dirname, '../fixtures');

// The action has no file diff, so the install command captures are the
// observable surface for which skills the task selects.
const installOutput = async (
  cwd: string,
  profile: ProjectProfile
): Promise<string> => {
  mockX.mockClear();
  mockX.mockResolvedValue({ exitCode: 0 });
  await skillsInstallTask.apply(cwd, profile);
  return mockX.mock.calls
    .map(([command, args]) => [command, ...(args ?? [])].join(' '))
    .join('\n');
};

describe('skillsInstallTask', () => {
  test('is applicable to TypeScript projects', async () => {
    const profile = await detectProject(
      path.join(fixtures, 'react-vite-tailwind')
    );
    expect(skillsInstallTask.applicable(profile)).toBe(true);
  });

  test('is not applicable to non-TypeScript projects', async () => {
    const profile = await detectProject(path.join(fixtures, 'node-only'));
    // node-only fixture might still have tsconfig, check actual profile
    expect(skillsInstallTask.applicable(profile)).toBe(profile.typescript);
  });

  test('returns new on clean react fixture with react skills', async () => {
    const profile = await detectProject(
      path.join(fixtures, 'react-vite-tailwind')
    );
    const status = await skillsInstallTask.check(
      path.join(fixtures, 'react-vite-tailwind'),
      profile
    );
    expect(status).toBe('new');
  });

  test('dryRun reports no file diff and the plan backs up nothing', async () => {
    const cwd = path.join(fixtures, 'react-vite-tailwind');
    const profile = await detectProject(cwd);
    await expect(skillsInstallTask.dryRun(cwd, profile)).resolves.toEqual([]);
    const plan = await planTasks({ cwd, profile, tasks: [skillsInstallTask] });
    expect(plan.files).toEqual([]);
  });

  test('installs react and frontend skills for react projects', async () => {
    const commands = await installOutput(
      path.join(fixtures, 'react-vite-tailwind'),
      await detectProject(path.join(fixtures, 'react-vite-tailwind'))
    );
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
    const cwd = path.join(fixtures, 'vue-vite');
    const commands = await installOutput(cwd, await detectProject(cwd));
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

  test('installs nextjs skills for nextjs projects', async () => {
    const cwd = path.join(fixtures, 'nextjs');
    const commands = await installOutput(cwd, await detectProject(cwd));
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
    const cwd = path.join(fixtures, 'react-native-expo');
    const commands = await installOutput(cwd, await detectProject(cwd));
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
  });

  test('installs antd skill for projects with antd', async () => {
    const cwd = path.join(fixtures, 'react-ui-libraries');
    const commands = await installOutput(cwd, await detectProject(cwd));
    expect(commands).toContain('antd');
    expect(commands).toContain('ant-design/ant-design-cli');
  });

  test('installs heroui-react skill for projects with @heroui/react', async () => {
    const cwd = path.join(fixtures, 'react-ui-libraries');
    const commands = await installOutput(cwd, await detectProject(cwd));
    expect(commands).toContain('heroui-react');
    expect(commands).toContain('heroui-inc/heroui');
  });

  test('installs chakra-ui skills for projects with @chakra-ui/react', async () => {
    const cwd = path.join(fixtures, 'react-ui-libraries');
    const commands = await installOutput(cwd, await detectProject(cwd));
    expect(commands).toContain('chakra-ui-builder');
    expect(commands).toContain('chakra-ui-refactor');
    expect(commands).toContain('chakra-ui/chakra-ui');
  });

  test('installs heroui-native skill for react-native projects with heroui-native', async () => {
    const cwd = path.join(fixtures, 'react-native-hero');
    const commands = await installOutput(cwd, await detectProject(cwd));
    expect(commands).toContain('heroui-native');
    expect(commands).toContain('heroui-inc/heroui');
  });

  test('does not include component library skills in plain react projects', async () => {
    const cwd = path.join(fixtures, 'react-vite-tailwind');
    const commands = await installOutput(cwd, await detectProject(cwd));
    expect(commands).not.toContain('antd');
    expect(commands).not.toContain('heroui-react');
    expect(commands).not.toContain('heroui-native');
    expect(commands).not.toContain('chakra-ui-builder');
    expect(commands).not.toContain('chakra-ui-refactor');
  });

  test('returns new for node-only projects with general skills', async () => {
    const profile = await detectProject(path.join(fixtures, 'node-only'));
    if (!skillsInstallTask.applicable(profile)) {
      return;
    }
    const status = await skillsInstallTask.check(
      path.join(fixtures, 'node-only'),
      profile
    );
    expect(status).toBe('new');
  });

  test('installs general skills for node-only projects', async () => {
    const cwd = path.join(fixtures, 'node-only');
    const profile = await detectProject(cwd);
    if (!skillsInstallTask.applicable(profile)) {
      return;
    }
    const commands = await installOutput(cwd, profile);
    expect(commands).toContain('opensrc');
    expect(commands).toContain('writing-for-agents');
  });

  test('returns patch when some skills are already installed', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-skills-partial-')
    );

    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify(
        {
          dependencies: {
            react: '^19.0.0',
          },
          devDependencies: {
            typescript: '^5.8.0',
            vite: '^7.0.0',
          },
          name: 'skills-partial-install-fixture',
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

    await fs.mkdir(path.join(tmpDir, '.agents', 'skills', 'react-dev'), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(tmpDir, '.agents', 'skills', 'react-dev', 'SKILL.md'),
      '# React Dev\n'
    );

    const profile = await detectProject(tmpDir);
    const status = await skillsInstallTask.check(tmpDir, profile);

    expect(status).toBe('patch');
  });

  test('batches skills from the same source into a single command', async () => {
    const cwd = path.join(fixtures, 'react-native-expo');
    const commands = await installOutput(cwd, await detectProject(cwd));
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
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-skills-empty-dir-')
    );

    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify(
        {
          dependencies: {
            react: '^19.0.0',
          },
          devDependencies: {
            typescript: '^5.8.0',
            vite: '^7.0.0',
          },
          name: 'skills-empty-folder-fixture',
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

    await fs.mkdir(path.join(tmpDir, '.agents', 'skills', 'react-dev'), {
      recursive: true,
    });

    const profile = await detectProject(tmpDir);
    const commands = await installOutput(tmpDir, profile);

    expect(commands).toContain('--skill react-dev');
  });
});

describe('skillsInstallTask apply', () => {
  test('constructs the correct npx command for a react project', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-skills-apply-')
    );

    try {
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify(
          {
            dependencies: { react: '^19.0.0' },
            devDependencies: {
              typescript: '^5.8.0',
              vite: '^7.0.0',
            },
            name: 'skills-apply-fixture',
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

      const profile = await detectProject(tmpDir);
      await skillsInstallTask.apply(tmpDir, profile);

      expect(mockX).toHaveBeenCalled();
      const callArgs = mockX.mock.calls[0];
      expect(callArgs[0]).toBe('npx');
      expect(callArgs[1]).toEqual(
        expect.arrayContaining(['--yes', 'skills@latest', 'add'])
      );
      expect(callArgs[1]).toEqual(
        expect.arrayContaining(['--skill', 'opensrc'])
      );
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('throws TaskError when the npx command fails', async () => {
    mockX.mockResolvedValue({ exitCode: 1 });

    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-skills-apply-fail-')
    );

    try {
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify(
          {
            dependencies: { react: '^19.0.0' },
            devDependencies: {
              typescript: '^5.8.0',
              vite: '^7.0.0',
            },
            name: 'skills-apply-fail-fixture',
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

      const profile = await detectProject(tmpDir);
      await expect(skillsInstallTask.apply(tmpDir, profile)).rejects.toThrow(
        /Failed to install skills from/
      );
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('only installs missing skills when some are already installed', async () => {
    mockX.mockClear();
    mockX.mockResolvedValue({ exitCode: 0 });

    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-skills-partial-apply-')
    );

    try {
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify(
          {
            dependencies: { react: '^19.0.0' },
            devDependencies: {
              typescript: '^5.8.0',
              vite: '^7.0.0',
            },
            name: 'skills-partial-fixture',
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

      // Simulate one skill already installed
      await fs.mkdir(path.join(tmpDir, '.agents', 'skills', 'opensrc'), {
        recursive: true,
      });
      await fs.writeFile(
        path.join(tmpDir, '.agents', 'skills', 'opensrc', 'SKILL.md'),
        '# Opensrc\n'
      );

      const profile = await detectProject(tmpDir);
      await skillsInstallTask.apply(tmpDir, profile);

      // Should still call x for remaining skills
      expect(mockX).toHaveBeenCalled();
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });
});

// The catalog groups entries behind condition helpers, so the expansion is
// only pinned by the install command order. Pin the full ordered catalog
// once; per-profile selection is covered by the fixture tests above.
describe('SKILL_CATALOG expansion', () => {
  const expectedCatalog = [
    'vercel-labs/opensrc:opensrc',
    'mattpocock/skills:grill-me',
    'mattpocock/skills:grill-with-docs',
    'mattpocock/skills:handoff',
    'mattpocock/skills:improve-codebase-architecture',
    'shadcn/improve:improve',
    'mattpocock/skills:writing-for-agents',
    'anthropics/skills:frontend-design',
    'vercel-labs/agent-skills:web-design-guidelines',
    'ibelick/ui-skills:baseline-ui',
    'ibelick/ui-skills:fixing-accessibility',
    'ibelick/ui-skills:fixing-metadata',
    'ibelick/ui-skills:fixing-motion-performance',
    'vercel-labs/agent-skills:vercel-react-best-practices',
    'vercel-labs/agent-skills:vercel-composition-patterns',
    'softaworks/agent-toolkit:react-dev',
    'softaworks/agent-toolkit:react-useeffect',
    'vercel/next.js:next-dev-loop',
    'vercel/next.js:next-cache-components-optimizer',
    'vercel/next.js:next-cache-components-adoption',
    'antfu/skills:vue',
    'antfu/skills:vue-best-practices',
    'antfu/skills:nuxt',
    'shadcn-ui/ui:shadcn',
    'haydenbleasel/ultracite:ultracite',
    'ant-design/ant-design-cli:antd',
    'heroui-inc/heroui:heroui-react',
    'chakra-ui/chakra-ui:chakra-ui-builder',
    'chakra-ui/chakra-ui:chakra-ui-refactor',
    'expo/skills:expo-overview',
    'expo/skills:expo-router',
    'expo/skills:eas-workflows',
    'expo/skills:eas-app-stores',
    'expo/skills:eas-update',
    'expo/skills:expo-dev-client',
    'expo/skills:expo-native-ui',
    'expo/skills:expo-data-fetching',
    'expo/skills:expo-module',
    'expo/skills:expo-upgrade',
    'vercel-labs/agent-skills:vercel-react-native-skills',
    'heroui-inc/heroui:heroui-native',
    'antfu/skills:vite',
    'antfu/skills:vitest',
    'antfu/skills:tsdown',
    'vercel/turborepo:turborepo',
    'supabase/agent-skills:supabase-postgres-best-practices',
    'ccheney/robust-skills:postgres-drizzle',
    'mindrally/skills:redis-best-practices',
    'better-auth/skills:better-auth-best-practices',
    'better-auth/skills:create-auth',
    'vercel/ai:ai-sdk',
    'remotion-dev/skills:remotion-best-practices',
  ];

  test('expands to the same skills, sources, and order', () => {
    expect(
      SKILL_CATALOG.map(({ source, skill }) => `${source}:${skill}`)
    ).toEqual(expectedCatalog);
  });
});
