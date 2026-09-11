import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectProject } from '@xtarterize/core';
import {
  agentsMdTask,
  knipTask,
  turboTask,
  vscodeTask,
} from '@xtarterize/tasks';
import { describe, expect } from 'vite-plus/test';

import { run } from '../helpers/run.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.resolve(__dirname, '../fixtures');

describe('knipTask', () => {
  test('is applicable to all projects (JSON format if no TS)', async () => {
    const tsProfile = await detectProject(
      path.join(fixtures, 'react-vite-tailwind')
    );
    expect(knipTask.applicable(tsProfile)).toBe(true);

    const nonTsProfile = await detectProject(
      path.join(fixtures, 'monorepo-turbo')
    );
    expect(knipTask.applicable(nonTsProfile)).toBe(true);
  });

  test('returns new on clean fixture', async () => {
    const profile = await detectProject(
      path.join(fixtures, 'react-vite-tailwind')
    );
    const status = await run(
      knipTask.check(path.join(fixtures, 'react-vite-tailwind'), profile)
    );
    expect(status).toBe('new');
  });
});

describe('vscodeTask', () => {
  test('is applicable to all projects', async () => {
    const profile = await detectProject(
      path.join(fixtures, 'react-vite-tailwind')
    );
    expect(vscodeTask.applicable(profile)).toBe(true);
  });

  test('dryRun returns settings and extensions diffs', async () => {
    const profile = await detectProject(
      path.join(fixtures, 'react-vite-tailwind')
    );
    const diffs = await run(
      vscodeTask.dryRun(path.join(fixtures, 'react-vite-tailwind'), profile)
    );
    expect(diffs.length).toBe(2);
    expect(diffs.some((d) => d.filepath.includes('settings.json'))).toBe(true);
    expect(diffs.some((d) => d.filepath.includes('extensions.json'))).toBe(
      true
    );
  });

  test('includes practical framework and styling settings', async () => {
    const profile = await detectProject(
      path.join(fixtures, 'react-vite-tailwind')
    );
    const diffs = await run(
      vscodeTask.dryRun(path.join(fixtures, 'react-vite-tailwind'), profile)
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

  test('renders byte-identical settings and extensions', async () => {
    const profile = await detectProject(
      path.join(fixtures, 'react-vite-tailwind')
    );
    const diffs = await run(
      vscodeTask.dryRun(path.join(fixtures, 'react-vite-tailwind'), profile)
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

  test('additively merges extensions into existing list', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-vsc-ext-')
    );
    await fs.mkdir(path.join(tmpDir, '.vscode'));
    await fs.writeFile(
      path.join(tmpDir, '.vscode', 'extensions.json'),
      JSON.stringify({
        recommendations: ['my-custom-extension', 'biomejs.biome'],
      })
    );
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        devDependencies: {
          '@biomejs/biome': '^1.0.0',
          typescript: '^5.3.0',
        },
        name: 'vsc-test',
      })
    );

    const profile = await detectProject(tmpDir);
    const diffs = await run(vscodeTask.dryRun(tmpDir, profile));
    const extDiff = diffs.find((d) => d.filepath.includes('extensions.json'));
    const result = JSON.parse(extDiff?.after ?? '{}');

    expect(result.recommendations).toContain('my-custom-extension');
    expect(result.recommendations).toContain('biomejs.biome');
    expect(result.recommendations).toContain(
      'ms-vscode.vscode-typescript-next'
    );

    await fs.rm(tmpDir, { recursive: true });
  });

  test('skips when settings and extensions already match', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-vsc-skip-')
    );
    await fs.mkdir(path.join(tmpDir, '.vscode'));

    const profile = await detectProject(tmpDir);
    const settingsDiffs = await run(vscodeTask.dryRun(tmpDir, profile));
    const settingsAfter = JSON.parse(
      settingsDiffs.find((d) => d.filepath.includes('settings.json'))?.after ??
        '{}'
    );
    const extAfter = JSON.parse(
      settingsDiffs.find((d) => d.filepath.includes('extensions.json'))
        ?.after ?? '{}'
    );

    await fs.writeFile(
      path.join(tmpDir, '.vscode', 'settings.json'),
      JSON.stringify(settingsAfter)
    );
    await fs.writeFile(
      path.join(tmpDir, '.vscode', 'extensions.json'),
      JSON.stringify(extAfter)
    );

    const status = await run(vscodeTask.check(tmpDir, profile));
    expect(status).toBe('skip');

    await fs.rm(tmpDir, { recursive: true });
  });

  test('apply writes the expected file', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarterize-vsc-apply-')
    );
    await fs.writeFile(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        devDependencies: { typescript: '^5.3.0' },
        name: 'apply-test',
      })
    );
    const profile = await detectProject(tmpDir);
    await run(vscodeTask.apply(tmpDir, profile));
    const settingsPath = path.join(tmpDir, '.vscode', 'settings.json');
    const exists = await fs
      .access(settingsPath)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
    await fs.rm(tmpDir, { force: true, recursive: true });
  });
});

describe('agentsMdTask', () => {
  test('is applicable to all projects', async () => {
    const profile = await detectProject(
      path.join(fixtures, 'react-vite-tailwind')
    );
    expect(agentsMdTask.applicable(profile)).toBe(true);
  });

  test('returns new when AGENTS.md is missing', async () => {
    const profile = await detectProject(
      path.join(fixtures, 'react-vite-tailwind')
    );
    const status = await run(
      agentsMdTask.check(path.join(fixtures, 'react-vite-tailwind'), profile)
    );
    expect(status).toBe('new');
  });

  test('renders minimal root with commands', async () => {
    const profile = await detectProject(
      path.join(fixtures, 'react-vite-tailwind')
    );
    const [diff] = await run(
      agentsMdTask.dryRun(path.join(fixtures, 'react-vite-tailwind'), profile)
    );

    expect(diff.after).toContain('## Commands');
    expect(diff.after).toContain('pnpm install');
    expect(diff.after).not.toContain('## Framework Guidance');
  });
});

describe('turboTask', () => {
  test('is applicable to monorepos only', async () => {
    const monoProfile = await detectProject(
      path.join(fixtures, 'monorepo-turbo')
    );
    expect(turboTask.applicable(monoProfile)).toBe(true);

    const nonMonoProfile = await detectProject(
      path.join(fixtures, 'react-vite-tailwind')
    );
    expect(turboTask.applicable(nonMonoProfile)).toBe(false);
  });
});
