import fs from 'node:fs/promises';
import path from 'node:path';
import { applyTaskSelection, loadSelectionConfig } from '@xtarterize/core';
import { describe, expect } from 'vite-plus/test';

import { run } from '../helpers/run.js';
import { withTempDir } from '../helpers/temp.js';

describe('loadSelectionConfig', () => {
  test('returns empty selection when no config file exists', async () => {
    await withTempDir('xtarter-selection-empty-', async (tmpDir) => {
      const selection = await run(loadSelectionConfig(tmpDir));
      expect(selection).toEqual({ only: [], skip: [] });
    });
  });

  test('reads skip/only from .xtarterizerc', async () => {
    await withTempDir('xtarter-selection-dot-', async (tmpDir) => {
      await fs.writeFile(
        path.join(tmpDir, '.xtarterizerc'),
        JSON.stringify({ only: ['ts/strict'], skip: ['agent/skills-install'] })
      );
      const selection = await run(loadSelectionConfig(tmpDir));
      expect(selection).toEqual({
        only: ['ts/strict'],
        skip: ['agent/skills-install'],
      });
    });
  });

  test('reads skip/only from .xtarterizerc.json', async () => {
    await withTempDir('xtarter-selection-json-', async (tmpDir) => {
      await fs.writeFile(
        path.join(tmpDir, '.xtarterizerc.json'),
        JSON.stringify({ skip: ['lint/biome'] })
      );
      const selection = await run(loadSelectionConfig(tmpDir));
      expect(selection).toEqual({ only: [], skip: ['lint/biome'] });
    });
  });

  test('falls back to package.json xtarterize key', async () => {
    await withTempDir('xtarter-selection-pkg-', async (tmpDir) => {
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ xtarterize: { skip: ['ts/incremental'] } })
      );
      const selection = await run(loadSelectionConfig(tmpDir));
      expect(selection).toEqual({ only: [], skip: ['ts/incremental'] });
    });
  });

  test('standalone file takes precedence over package.json key', async () => {
    await withTempDir('xtarter-selection-prio-', async (tmpDir) => {
      await fs.writeFile(
        path.join(tmpDir, '.xtarterizerc'),
        JSON.stringify({ skip: ['from-file'] })
      );
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ xtarterize: { skip: ['from-pkg'] } })
      );
      const selection = await run(loadSelectionConfig(tmpDir));
      expect(selection).toEqual({ only: [], skip: ['from-file'] });
    });
  });

  test('trims entries and drops empty strings and non-string entries', async () => {
    await withTempDir('xtarter-selection-sane-', async (tmpDir) => {
      await fs.writeFile(
        path.join(tmpDir, '.xtarterizerc'),
        JSON.stringify({
          only: [true, ' ts/incremental ', ''],
          skip: ['  ts/strict  ', '', 42, null, 'lint/biome'],
        })
      );
      const selection = await run(loadSelectionConfig(tmpDir));
      expect(selection).toEqual({
        only: ['ts/incremental'],
        skip: ['ts/strict', 'lint/biome'],
      });
    });
  });

  test('returns defaults on malformed JSON without throwing', async () => {
    await withTempDir('xtarter-selection-bad-', async (tmpDir) => {
      await fs.writeFile(path.join(tmpDir, '.xtarterizerc'), 'not-json{');
      const selection = await run(loadSelectionConfig(tmpDir));
      expect(selection).toEqual({ only: [], skip: [] });
    });
  });

  test('treats an empty only array as no restriction (defaults)', async () => {
    await withTempDir('xtarter-selection-emptyonly-', async (tmpDir) => {
      await fs.writeFile(
        path.join(tmpDir, '.xtarterizerc'),
        JSON.stringify({ only: [] })
      );
      const selection = await run(loadSelectionConfig(tmpDir));
      expect(selection).toEqual({ only: [], skip: [] });
    });
  });
});

describe('applyTaskSelection', () => {
  const tasks = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  test('passes all tasks through when no selection is provided', () => {
    expect(applyTaskSelection(tasks, {})).toEqual(tasks);
  });

  test('CLI --only overrides configOnly', () => {
    const result = applyTaskSelection(tasks, {
      cliOnly: 'a',
      configOnly: ['b', 'c'],
    });
    expect(result.map((t) => t.id)).toEqual(['a']);
  });

  test('CLI --only empty string falls back to configOnly', () => {
    const result = applyTaskSelection(tasks, {
      cliOnly: '',
      configOnly: ['b'],
    });
    expect(result.map((t) => t.id)).toEqual(['b']);
  });

  test('CLI --skip unions with configSkip', () => {
    const result = applyTaskSelection(tasks, {
      cliSkip: 'c',
      configSkip: ['a'],
    });
    expect(result.map((t) => t.id)).toEqual(['b']);
  });

  test('task in config.skip AND config.only is excluded (skip wins)', () => {
    const result = applyTaskSelection(tasks, {
      configOnly: ['a', 'b'],
      configSkip: ['a'],
    });
    expect(result.map((t) => t.id)).toEqual(['b']);
  });
});
