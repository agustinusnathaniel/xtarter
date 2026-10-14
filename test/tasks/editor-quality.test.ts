import fs from 'node:fs/promises';
import path from 'node:path';
import {
  fixtureDir,
  fixtureProfile,
  withProject,
} from '@test/helpers/project.js';
import { run } from '@test/helpers/run.js';
import { describe, expect } from 'vite-plus/test';

import { agentsMdTask } from '../../packages/tasks/src/agent/agents-md.js';
import { vscodeTask } from '../../packages/tasks/src/editor/vscode.js';
import { turboTask } from '../../packages/tasks/src/monorepo/turbo.js';

describe('vscodeTask', () => {
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

describe('agentsMdTask', () => {
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
