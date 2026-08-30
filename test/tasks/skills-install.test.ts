import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectProject } from '@xtarterize/core';
import { skillsInstallTask } from '@xtarterize/tasks';
import { describe, expect, vi } from 'vite-plus/test';

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

  test('dryRun includes react and frontend skills for react projects', async () => {
    const profile = await detectProject(
      path.join(fixtures, 'react-vite-tailwind')
    );
    const diffs = await skillsInstallTask.dryRun(
      path.join(fixtures, 'react-vite-tailwind'),
      profile
    );
    expect(diffs.length).toBe(1);
    expect(diffs[0].filepath).toBe('.xtarterize/skills-install.log');
    expect(diffs[0].before).toBeNull();
    const after = diffs[0].after ?? '';
    // React skills
    expect(after).toContain('vercel-react-best-practices');
    expect(after).toContain('vercel-composition-patterns');
    expect(after).toContain('react-dev');
    expect(after).toContain('react-useeffect');
    // Frontend / UI skills
    expect(after).toContain('frontend-design');
    expect(after).toContain('web-design-guidelines');
    expect(after).toContain('baseline-ui');
    expect(after).toContain('fixing-accessibility');
    expect(after).toContain('fixing-metadata');
    expect(after).toContain('fixing-motion-performance');
    // Build tool skills
    expect(after).toContain('vite');
    // General skills
    expect(after).toContain('opensrc');
    expect(after).toContain('grill-me');
    expect(after).toContain('handoff');
    expect(after).toContain('improve-codebase-architecture');
    expect(after).toContain('writing-great-skills');
  });

  test('dryRun includes vue and frontend skills for vue projects', async () => {
    const profile = await detectProject(path.join(fixtures, 'vue-vite'));
    const diffs = await skillsInstallTask.dryRun(
      path.join(fixtures, 'vue-vite'),
      profile
    );
    expect(diffs.length).toBe(1);
    const after = diffs[0].after ?? '';
    // Vue skills
    expect(after).toContain('vue');
    expect(after).toContain('vue-best-practices');
    // Frontend / UI skills
    expect(after).toContain('frontend-design');
    expect(after).toContain('web-design-guidelines');
    expect(after).toContain('baseline-ui');
    // Build tool skills
    expect(after).toContain('vite');
    // React skills should NOT be present
    expect(after).not.toContain('vercel-react-best-practices');
    expect(after).not.toContain('vercel-composition-patterns');
    expect(after).not.toContain('react-dev');
    expect(after).not.toContain('react-useeffect');
  });

  test('dryRun includes nextjs skills for nextjs projects', async () => {
    const profile = await detectProject(path.join(fixtures, 'nextjs'));
    const diffs = await skillsInstallTask.dryRun(
      path.join(fixtures, 'nextjs'),
      profile
    );
    expect(diffs.length).toBe(1);
    const after = diffs[0].after ?? '';
    // Next.js skills
    expect(after).toContain('next-dev-loop');
    expect(after).toContain('next-cache-components-optimizer');
    expect(after).toContain('next-cache-components-adoption');
    // React skills (Next.js is React)
    expect(after).toContain('vercel-react-best-practices');
    expect(after).toContain('react-dev');
    expect(after).toContain('react-useeffect');
    // Frontend / UI skills
    expect(after).toContain('baseline-ui');
  });

  test('dryRun includes expo skills for expo projects', async () => {
    const profile = await detectProject(
      path.join(fixtures, 'react-native-expo')
    );
    const diffs = await skillsInstallTask.dryRun(
      path.join(fixtures, 'react-native-expo'),
      profile
    );
    expect(diffs.length).toBe(1);
    const after = diffs[0].after ?? '';
    expect(after).toContain('expo-tailwind-setup');
    expect(after).toContain('expo-cicd-workflows');
    expect(after).toContain('expo-deployment');
    expect(after).toContain('expo-dev-client');
    expect(after).toContain('building-native-ui');
    expect(after).toContain('native-data-fetching');
    expect(after).toContain('expo-module');
    expect(after).toContain('upgrading-expo');
    expect(after).toContain('vercel-react-native-skills');
  });

  test('dryRun includes antd skill for projects with antd', async () => {
    const profile = await detectProject(
      path.join(fixtures, 'react-ui-libraries')
    );
    const diffs = await skillsInstallTask.dryRun(
      path.join(fixtures, 'react-ui-libraries'),
      profile
    );
    expect(diffs.length).toBe(1);
    const after = diffs[0].after ?? '';
    expect(after).toContain('antd');
    expect(after).toContain('ant-design/ant-design-cli');
  });

  test('dryRun includes heroui-react skill for projects with @heroui/react', async () => {
    const profile = await detectProject(
      path.join(fixtures, 'react-ui-libraries')
    );
    const diffs = await skillsInstallTask.dryRun(
      path.join(fixtures, 'react-ui-libraries'),
      profile
    );
    const after = diffs[0].after ?? '';
    expect(after).toContain('heroui-react');
    expect(after).toContain('heroui-inc/heroui');
  });

  test('dryRun includes chakra-ui skills for projects with @chakra-ui/react', async () => {
    const profile = await detectProject(
      path.join(fixtures, 'react-ui-libraries')
    );
    const diffs = await skillsInstallTask.dryRun(
      path.join(fixtures, 'react-ui-libraries'),
      profile
    );
    const after = diffs[0].after ?? '';
    expect(after).toContain('chakra-ui-builder');
    expect(after).toContain('chakra-ui-refactor');
    expect(after).toContain('chakra-ui/chakra-ui');
  });

  test('dryRun includes heroui-native skill for react-native projects with heroui-native', async () => {
    const profile = await detectProject(
      path.join(fixtures, 'react-native-hero')
    );
    const diffs = await skillsInstallTask.dryRun(
      path.join(fixtures, 'react-native-hero'),
      profile
    );
    expect(diffs.length).toBe(1);
    const after = diffs[0].after ?? '';
    expect(after).toContain('heroui-native');
    expect(after).toContain('heroui-inc/heroui');
  });

  test('does not include component library skills in plain react projects', async () => {
    const profile = await detectProject(
      path.join(fixtures, 'react-vite-tailwind')
    );
    const diffs = await skillsInstallTask.dryRun(
      path.join(fixtures, 'react-vite-tailwind'),
      profile
    );
    const after = diffs[0].after ?? '';
    expect(after).not.toContain('antd');
    expect(after).not.toContain('heroui-react');
    expect(after).not.toContain('heroui-native');
    expect(after).not.toContain('chakra-ui-builder');
    expect(after).not.toContain('chakra-ui-refactor');
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

  test('returns general skills for node-only projects', async () => {
    const profile = await detectProject(path.join(fixtures, 'node-only'));
    if (!skillsInstallTask.applicable(profile)) {
      return;
    }
    const diffs = await skillsInstallTask.dryRun(
      path.join(fixtures, 'node-only'),
      profile
    );
    expect(diffs.length).toBe(1);
    const after = diffs[0].after ?? '';
    expect(after).toContain('opensrc');
    expect(after).toContain('writing-great-skills');
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

    await fs.writeFile(
      path.join(tmpDir, 'skills-lock.json'),
      JSON.stringify(
        {
          skills: {
            'react-dev': {
              source: 'softaworks/agent-toolkit',
            },
          },
        },
        null,
        2
      )
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
    const profile = await detectProject(
      path.join(fixtures, 'react-native-expo')
    );
    const diffs = await skillsInstallTask.dryRun(
      path.join(fixtures, 'react-native-expo'),
      profile
    );
    const after = diffs[0].after ?? '';
    // expo/skills has 8 skills - they should appear in a single command
    const expoLine = after.split('\n').find((l) => l.includes('expo/skills'));
    expect(expoLine).toBeDefined();
    expect(expoLine).toContain('--skill expo-tailwind-setup');
    expect(expoLine).toContain('--skill expo-cicd-workflows');
    expect(expoLine).toContain('--skill expo-deployment');
    expect(expoLine).toContain('--skill expo-dev-client');
    expect(expoLine).toContain('--skill building-native-ui');
    expect(expoLine).toContain('--skill native-data-fetching');
    expect(expoLine).toContain('--skill expo-module');
    expect(expoLine).toContain('--skill upgrading-expo');
    // Should NOT have separate lines for the same source
    const expoLines = after
      .split('\n')
      .filter((l) => l.includes('expo/skills'));
    expect(expoLines.length).toBe(1);
  });

  test('does not treat empty skill folders as installed when lock entry exists', async () => {
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

    await fs.writeFile(
      path.join(tmpDir, 'skills-lock.json'),
      JSON.stringify(
        {
          skills: {
            'react-dev': {
              source: 'softaworks/agent-toolkit',
            },
          },
        },
        null,
        2
      )
    );

    await fs.mkdir(path.join(tmpDir, '.agents', 'skills', 'react-dev'), {
      recursive: true,
    });

    const profile = await detectProject(tmpDir);
    const diffs = await skillsInstallTask.dryRun(tmpDir, profile);
    const after = diffs[0]?.after ?? '';

    expect(diffs.length).toBe(1);
    expect(after).toContain('--skill react-dev');
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
