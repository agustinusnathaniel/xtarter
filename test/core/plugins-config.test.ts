import fs from 'node:fs/promises';
import path from 'node:path';
import { loadPluginConfig, resolveExternalTasks } from '@xtarterize/core';
import { describe, expect } from 'vite-plus/test';

import { run } from '../helpers/run.js';
import { withTempDir } from '../helpers/temp.js';

describe('loadPluginConfig', () => {
  test('returns null when no config file exists', async () => {
    await withTempDir('xtarter-plugins-empty-', async (tmpDir) => {
      const config = await run(loadPluginConfig(tmpDir));
      expect(config).toBeNull();
    });
  });

  test('reads plugins from .xtarterizerc', async () => {
    await withTempDir('xtarter-plugins-dot-', async (tmpDir) => {
      await fs.writeFile(
        path.join(tmpDir, '.xtarterizerc'),
        JSON.stringify({ plugins: ['@xtarterize/plugin-foo'] })
      );
      const config = await run(loadPluginConfig(tmpDir));
      expect(config).not.toBeNull();
      expect(config?.plugins).toEqual(['@xtarterize/plugin-foo']);
    });
  });

  test('reads plugins from .xtarterizerc.json', async () => {
    await withTempDir('xtarter-plugins-json-', async (tmpDir) => {
      await fs.writeFile(
        path.join(tmpDir, '.xtarterizerc.json'),
        JSON.stringify({ plugins: ['my-plugin'] })
      );
      const config = await run(loadPluginConfig(tmpDir));
      expect(config).not.toBeNull();
      expect(config?.plugins).toEqual(['my-plugin']);
    });
  });

  test('reads plugins from .xtarterizerc.json5', async () => {
    await withTempDir('xtarter-plugins-json5-', async (tmpDir) => {
      await fs.writeFile(
        path.join(tmpDir, '.xtarterizerc.json5'),
        JSON.stringify({ plugins: ['json5-plugin'] })
      );
      const config = await run(loadPluginConfig(tmpDir));
      expect(config).not.toBeNull();
      expect(config?.plugins).toEqual(['json5-plugin']);
    });
  });

  test('uses the first matching config file (priority order)', async () => {
    await withTempDir('xtarter-plugins-priority-', async (tmpDir) => {
      // Both exist - .xtarterizerc should win (first in CONFIG_BASENAMES)
      await fs.writeFile(
        path.join(tmpDir, '.xtarterizerc'),
        JSON.stringify({ plugins: ['from-rc'] })
      );
      await fs.writeFile(
        path.join(tmpDir, '.xtarterizerc.json'),
        JSON.stringify({ plugins: ['from-json'] })
      );
      const config = await run(loadPluginConfig(tmpDir));
      expect(config?.plugins).toEqual(['from-rc']);
    });
  });

  test('reads plugins from package.json xtarterize key', async () => {
    await withTempDir('xtarter-plugins-pkg-', async (tmpDir) => {
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({
          xtarterize: { plugins: ['@xtarterize/plugin-bar'] },
        })
      );
      const config = await run(loadPluginConfig(tmpDir));
      expect(config).not.toBeNull();
      expect(config?.plugins).toEqual(['@xtarterize/plugin-bar']);
    });
  });

  test('returns null when package.json lacks xtarterize key', async () => {
    await withTempDir('xtarter-plugins-nopkg-', async (tmpDir) => {
      await fs.writeFile(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ name: 'test' })
      );
      const config = await run(loadPluginConfig(tmpDir));
      expect(config).toBeNull();
    });
  });

  test('returns empty plugins array on malformed .xtarterizerc', async () => {
    await withTempDir('xtarter-plugins-bad-', async (tmpDir) => {
      await fs.writeFile(path.join(tmpDir, '.xtarterizerc'), 'not-json{');
      const config = await run(loadPluginConfig(tmpDir));
      // Current behavior: returns { plugins: [] } on parse failure
      expect(config).toEqual({ plugins: [] });
    });
  });

  test('returns empty plugins when config object has no plugins field', async () => {
    await withTempDir('xtarter-plugins-nofield-', async (tmpDir) => {
      await fs.writeFile(
        path.join(tmpDir, '.xtarterizerc'),
        JSON.stringify({})
      );
      const config = await run(loadPluginConfig(tmpDir));
      // Current behavior: returns { plugins: [] } when plugins is missing
      expect(config).toEqual({ plugins: [] });
    });
  });

  test('returns empty plugins when plugins field is not an array', async () => {
    await withTempDir('xtarter-plugins-notarray-', async (tmpDir) => {
      await fs.writeFile(
        path.join(tmpDir, '.xtarterizerc'),
        JSON.stringify({ plugins: 'string' })
      );
      const config = await run(loadPluginConfig(tmpDir));
      // Current behavior: returns { plugins: [] } for non-array plugins
      expect(config).toEqual({ plugins: [] });
    });
  });
});

describe('resolveExternalTasks', () => {
  test('returns empty array when no config exists', async () => {
    await withTempDir('xtarter-resolve-noconfig-', async (tmpDir) => {
      const tasks = await run(resolveExternalTasks(tmpDir));
      expect(tasks).toEqual([]);
    });
  });

  test('returns empty array when .xtarterizerc has valid npm specifiers that fail resolution', async () => {
    // Valid npm specifiers pass validatePluginSpecifier but will fail
    // dynamic import() since the packages aren't installed.
    // loadPluginTasks catches the error and returns [].
    await withTempDir('xtarter-resolve-valid-', async (tmpDir) => {
      await fs.writeFile(
        path.join(tmpDir, '.xtarterizerc'),
        JSON.stringify({ plugins: ['@xtarterize/some-plugin'] })
      );
      const tasks = await run(resolveExternalTasks(tmpDir));
      expect(tasks).toEqual([]);
    });
  });

  test('returns empty array when .xtarterizerc has invalid specifiers that are skipped', async () => {
    // Invalid specifiers are caught by validatePluginSpecifier and skipped.
    await withTempDir('xtarter-resolve-invalid-', async (tmpDir) => {
      await fs.writeFile(
        path.join(tmpDir, '.xtarterizerc'),
        JSON.stringify({
          plugins: ['../../malicious.js', 'file:///etc/passwd'],
        })
      );
      const tasks = await run(resolveExternalTasks(tmpDir));
      expect(tasks).toEqual([]);
    });
  });

  test('handles duplicate specifiers without crashing', async () => {
    // Duplicate specifiers each attempt import() independently;
    // the function should not throw even though both fail.
    await withTempDir('xtarter-resolve-dup-', async (tmpDir) => {
      await fs.writeFile(
        path.join(tmpDir, '.xtarterizerc'),
        JSON.stringify({
          plugins: ['@xtarterize/some-plugin', '@xtarterize/some-plugin'],
        })
      );
      const tasks = await run(resolveExternalTasks(tmpDir));
      expect(Array.isArray(tasks)).toBe(true);
    });
  });
});
