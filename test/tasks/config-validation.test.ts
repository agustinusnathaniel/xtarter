import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectProject } from '@xtarterize/core';
import {
  biomeTask,
  oxfmtTask,
  oxlintTask,
  renovateTask,
  vscodeTask,
} from '@xtarterize/tasks';
import { describe, expect } from 'vite-plus/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.resolve(__dirname, '../fixtures');

describe('biome config validation', () => {
  test('rendered biome.json is valid JSON with expected structure', async () => {
    const testDir = path.join(fixtures, 'react-vite-tailwind');
    const profile = await detectProject(testDir);
    const diffs = await biomeTask.dryRun(testDir, profile);
    const configFile = diffs.find((d) => d.filepath === 'biome.json');
    if (!configFile) {
      throw new Error('Expected biome.json diff to exist');
    }

    const config = JSON.parse(configFile.after);
    expect(config.formatter.indentStyle).toBe('space');
    expect(config.linter.rules.style.useConsistentTypeDefinitions).toBe('off');
    expect(config.javascript.formatter.quoteStyle).toBe('single');
  });

  test('includes css.tailwindDirectives for tailwind projects', async () => {
    const testDir = path.join(fixtures, 'react-vite-tailwind');
    const profile = await detectProject(testDir);
    const diffs = await biomeTask.dryRun(testDir, profile);
    const configFile = diffs.find((d) => d.filepath === 'biome.json');
    if (!configFile) {
      throw new Error('Expected biome.json diff to exist');
    }

    const config = JSON.parse(configFile.after);
    expect(config.css?.parser?.tailwindDirectives).toBe(true);
  });
});

describe('renovate config validation', () => {
  test('rendered renovate.json is valid JSON', async () => {
    const testDir = path.join(fixtures, 'react-vite-tailwind');
    const profile = await detectProject(testDir);
    const diffs = await renovateTask.dryRun(testDir, profile);
    const configFile = diffs.find((d) => d.filepath === 'renovate.json');

    if (!configFile) {
      throw new Error('Expected renovate.json diff to exist');
    }
    expect(() => JSON.parse(configFile.after)).not.toThrow();
    const config = JSON.parse(configFile.after);
    expect(config.$schema).toBeDefined();
  });
});

describe('vscode config validation', () => {
  test('rendered .vscode/settings.json is valid JSON', async () => {
    const testDir = path.join(fixtures, 'react-vite-tailwind');
    const profile = await detectProject(testDir);
    const diffs = await vscodeTask.dryRun(testDir, profile);
    const settingsFile = diffs.find((d) =>
      d.filepath.endsWith('settings.json')
    );

    if (!settingsFile) {
      throw new Error('Expected settings.json diff to exist');
    }
    expect(() => JSON.parse(settingsFile.after)).not.toThrow();
  });
});

describe('all config templates render without runtime errors', () => {
  test('all lint tool configs render for a Vite+ project', async () => {
    const testDir = path.join(fixtures, 'vite-plus-no-lint');
    const profile = await detectProject(testDir);
    const results = await Promise.allSettled([
      oxlintTask.dryRun(testDir, profile),
      oxfmtTask.dryRun(testDir, profile),
    ]);

    for (const result of results) {
      if (result.status === 'rejected') {
        throw new Error(`Template render failed: ${result.reason}`);
      }
    }
  });

  test('all lint tool configs render for a non-Vite+ project', async () => {
    const testDir = path.join(fixtures, 'react-vite-tailwind');
    const profile = await detectProject(testDir);
    const results = await Promise.allSettled([
      biomeTask.dryRun(testDir, profile),
      renovateTask.dryRun(testDir, profile),
      vscodeTask.dryRun(testDir, profile),
    ]);

    for (const result of results) {
      if (result.status === 'rejected') {
        throw new Error(`Template render failed: ${result.reason}`);
      }
    }
  });
});
