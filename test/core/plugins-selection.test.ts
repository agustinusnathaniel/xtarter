import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { applyTaskSelection, loadSelectionConfig } from '@xtarterize/core';
import { describe, expect } from 'vite-plus/test';

describe('loadSelectionConfig', () => {
  test('returns empty selection when no config file exists', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarter-selection-empty-')
    );
    try {
      const selection = await loadSelectionConfig(tmpDir);
      expect(selection).toEqual({ only: [], skip: [] });
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('reads skip/only from .xtarterizerc', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarter-selection-dot-')
    );
    try {
      await fs.writeFile(
        path.join(tmpDir, '.xtarterizerc'),
        JSON.stringify({ only: ['ts/strict'], skip: ['agent/skills-install'] })
      );
      const selection = await loadSelectionConfig(tmpDir);
      expect(selection).toEqual({
        only: ['ts/strict'],
        skip: ['agent/skills-install'],
      });
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('reads skip/only from .xtarterizerc.json', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarter-selection-json-')
    );
    try {
      await fs.writeFile(
        path.join(tmpDir, '.xtarterizerc.json'),
        JSON.stringify({ skip: ['lint/biome'] })
      );
      const selection = await loadSelectionConfig(tmpDir);
      expect(selection).toEqual({ only: [], skip: ['lint/biome'] });
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('falls back to package.json xtarterize key', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarter-selection-pkg-')
    );
    try {
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ xtarterize: { skip: ['ts/incremental'] } })
      );
      const selection = await loadSelectionConfig(tmpDir);
      expect(selection).toEqual({ only: [], skip: ['ts/incremental'] });
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('standalone file takes precedence over package.json key', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarter-selection-prio-')
    );
    try {
      await fs.writeFile(
        path.join(tmpDir, '.xtarterizerc'),
        JSON.stringify({ skip: ['from-file'] })
      );
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ xtarterize: { skip: ['from-pkg'] } })
      );
      const selection = await loadSelectionConfig(tmpDir);
      expect(selection).toEqual({ only: [], skip: ['from-file'] });
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('trims entries and drops empty strings and non-string entries', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarter-selection-sane-')
    );
    try {
      await fs.writeFile(
        path.join(tmpDir, '.xtarterizerc'),
        JSON.stringify({
          only: [true, ' ts/incremental ', ''],
          skip: ['  ts/strict  ', '', 42, null, 'lint/biome'],
        })
      );
      const selection = await loadSelectionConfig(tmpDir);
      expect(selection).toEqual({
        only: ['ts/incremental'],
        skip: ['ts/strict', 'lint/biome'],
      });
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('returns defaults on malformed JSON without throwing', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarter-selection-bad-')
    );
    try {
      await fs.writeFile(path.join(tmpDir, '.xtarterizerc'), 'not-json{');
      const selection = await loadSelectionConfig(tmpDir);
      expect(selection).toEqual({ only: [], skip: [] });
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
  });

  test('treats an empty only array as no restriction (defaults)', async () => {
    const tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'xtarter-selection-emptyonly-')
    );
    try {
      await fs.writeFile(
        path.join(tmpDir, '.xtarterizerc'),
        JSON.stringify({ only: [] })
      );
      const selection = await loadSelectionConfig(tmpDir);
      expect(selection).toEqual({ only: [], skip: [] });
    } finally {
      await fs.rm(tmpDir, { force: true, recursive: true });
    }
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
