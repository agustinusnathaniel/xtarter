import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect } from 'vite-plus/test';

import { agentsMdTask } from '../../packages/tasks/src/agent/agents-md.js';
import { vscodeTask } from '../../packages/tasks/src/editor/vscode.js';
import { turboTask } from '../../packages/tasks/src/monorepo/turbo.js';
import { knipTask } from '../../packages/tasks/src/quality/knip.js';
import { fixtureDir, fixtureProfile, withProject } from '../helpers/project.js';
import { run } from '../helpers/run.js';

describe('knipTask', () => {
  test('is applicable to all projects (JSON format if no TS)', async () => {
    const tsProfile = await fixtureProfile('react-vite-tailwind');
    expect(knipTask.applicable(tsProfile)).toBe(true);

    const nonTsProfile = await fixtureProfile('monorepo-turbo');
    expect(knipTask.applicable(nonTsProfile)).toBe(true);
  });

  test('returns new on clean fixture', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    const status = await run(
      knipTask.check(fixtureDir('react-vite-tailwind'), profile)
    );
    expect(status).toBe('new');
  });
});

describe('vscodeTask', () => {
  test('is applicable to all projects', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    expect(vscodeTask.applicable(profile)).toBe(true);
  });

  test('dryRun returns settings and extensions diffs', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    const diffs = await run(
      vscodeTask.dryRun(fixtureDir('react-vite-tailwind'), profile)
    );
    expect(diffs.length).toBe(2);
    expect(diffs.some((d) => d.filepath.includes('settings.json'))).toBe(true);
    expect(diffs.some((d) => d.filepath.includes('extensions.json'))).toBe(
      true
    );
  });

  test('includes practical framework and styling settings', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    const diffs = await run(
      vscodeTask.dryRun(fixtureDir('react-vite-tailwind'), profile)
    );
    const settings = JSON.parse(
      diffs.find((d) => d.filepath.includes('settings.json'))?.after ?? '{}'
    );
    const extensions = JSON.parse(
      diffs.find((d) => d.filepath.includes('extensions.json'))?.after ?? '{}'
    );

    expect(settings['typescript.updateImportsOnFileMove.enabled']).toBe(
      'always'
    );
    expect(settings['tailwindCSS.experimental.classRegex']).toBeDefined();
    expect(extensions.recommendations).toContain('bradlc.vscode-tailwindcss');
  });
});

describe('vscodeTask', () => {
  test('renders byte-identical settings and extensions', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    const diffs = await run(
      vscodeTask.dryRun(fixtureDir('react-vite-tailwind'), profile)
    );
    const settings = diffs.find((d) => d.filepath.includes('settings.json'));
    const extensions = diffs.find((d) =>
      d.filepath.includes('extensions.json')
    );

    expect(settings?.after).toBe(
      JSON.stringify(
        // biome-ignore assist/source/useSortedKeys: key order defines the rendered bytes
        {
          '[javascript]': { 'editor.defaultFormatter': 'biomejs.biome' },
          '[json]': { 'editor.defaultFormatter': 'biomejs.biome' },
          '[jsonc]': { 'editor.defaultFormatter': 'biomejs.biome' },
          '[typescript]': { 'editor.defaultFormatter': 'biomejs.biome' },
          '[typescriptreact]': { 'editor.defaultFormatter': 'biomejs.biome' },
          'editor.codeActionsOnSave': {
            'source.fixAll.biome': 'explicit',
            'source.organizeImports.biome': 'explicit',
          },
          'editor.defaultFormatter': 'biomejs.biome',
          'editor.formatOnPaste': false,
          'editor.formatOnSave': true,
          'javascript.updateImportsOnFileMove.enabled': 'always',
          'typescript.preferences.importModuleSpecifier': 'non-relative',
          'typescript.updateImportsOnFileMove.enabled': 'always',
          'files.associations': { '*.css': 'tailwindcss' },
          'tailwindCSS.experimental.classRegex': [
            ['cva\\(([^)]*)\\)', '["\'`]([^"\'`]*).*?["\'`]'],
            ['cn\\(([^)]*)\\)', '["\'`]([^"\'`]*).*?["\'`]'],
          ],
          'typescript.disableAutomaticTypeAcquisition': true,
          'typescript.enablePromptUseWorkspaceTsdk': true,
        },
        null,
        2
      )
    );
    expect(extensions?.after).toBe(
      JSON.stringify(
        {
          recommendations: [
            'biomejs.biome',
            'ms-vscode.vscode-typescript-next',
            'bradlc.vscode-tailwindcss',
          ],
        },
        null,
        2
      )
    );
  });
});

describe('vscodeTask', () => {
  test('additively merges extensions into existing list', async () => {
    await withProject(
      {
        '.vscode/extensions.json': {
          recommendations: ['my-custom-extension', 'biomejs.biome'],
        },
        'package.json': {
          devDependencies: {
            '@biomejs/biome': '^1.0.0',
            typescript: '^5.3.0',
          },
          name: 'vsc-test',
        },
      },
      async ({ cwd, profile }) => {
        const diffs = await run(vscodeTask.dryRun(cwd, profile));
        const extDiff = diffs.find((d) =>
          d.filepath.includes('extensions.json')
        );
        const result = JSON.parse(extDiff?.after ?? '{}');

        expect(result.recommendations).toContain('my-custom-extension');
        expect(result.recommendations).toContain('biomejs.biome');
        expect(result.recommendations).toContain(
          'ms-vscode.vscode-typescript-next'
        );
      }
    );
  });

  test('skips when settings and extensions already match', async () => {
    await withProject({}, async ({ cwd, profile }) => {
      const settingsDiffs = await run(vscodeTask.dryRun(cwd, profile));
      const settingsAfter = JSON.parse(
        settingsDiffs.find((d) => d.filepath.includes('settings.json'))
          ?.after ?? '{}'
      );
      const extAfter = JSON.parse(
        settingsDiffs.find((d) => d.filepath.includes('extensions.json'))
          ?.after ?? '{}'
      );

      await fs.mkdir(path.join(cwd, '.vscode'), { recursive: true });
      await fs.writeFile(
        path.join(cwd, '.vscode', 'settings.json'),
        JSON.stringify(settingsAfter)
      );
      await fs.writeFile(
        path.join(cwd, '.vscode', 'extensions.json'),
        JSON.stringify(extAfter)
      );

      const status = await run(vscodeTask.check(cwd, profile));
      expect(status).toBe('skip');
    });
  });
});

describe('vscodeTask', () => {
  test('apply writes the expected file', async () => {
    await withProject(
      {
        'package.json': {
          devDependencies: { typescript: '^5.3.0' },
          name: 'apply-test',
        },
      },
      async ({ cwd, profile }) => {
        await run(vscodeTask.apply(cwd, profile));
        const settingsPath = path.join(cwd, '.vscode', 'settings.json');
        const exists = await fs
          .access(settingsPath)
          .then(() => true)
          .catch(() => false);
        expect(exists).toBe(true);
      }
    );
  });
});

describe('agentsMdTask', () => {
  test('is applicable to all projects', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    expect(agentsMdTask.applicable(profile)).toBe(true);
  });

  test('returns new when AGENTS.md is missing', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    const status = await run(
      agentsMdTask.check(fixtureDir('react-vite-tailwind'), profile)
    );
    expect(status).toBe('new');
  });

  test('renders minimal root with commands', async () => {
    const profile = await fixtureProfile('react-vite-tailwind');
    const [diff] = await run(
      agentsMdTask.dryRun(fixtureDir('react-vite-tailwind'), profile)
    );

    expect(diff.after).toContain('## Commands');
    expect(diff.after).toContain('pnpm install');
    expect(diff.after).not.toContain('## Framework Guidance');
  });
});

describe('turboTask', () => {
  test('is applicable to monorepos only', async () => {
    const monoProfile = await fixtureProfile('monorepo-turbo');
    expect(turboTask.applicable(monoProfile)).toBe(true);

    const nonMonoProfile = await fixtureProfile('react-vite-tailwind');
    expect(turboTask.applicable(nonMonoProfile)).toBe(false);
  });
});
