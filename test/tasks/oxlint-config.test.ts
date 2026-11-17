import {
  fixtureDir,
  fixtureProfile,
  withProject,
} from '@test/helpers/project.js';
import { run } from '@test/helpers/run.js';
import { describe, expect } from 'vite-plus/test';

import {
  createOxfmtTask,
  createOxlintTask,
  oxfmtTask,
  oxlintTask,
} from '../../packages/tasks/src/lint/oxlint.js';

const ejectedOxlintTask = createOxlintTask({ eject: true });
const ejectedOxfmtTask = createOxfmtTask({ eject: true });

const vitePlusPackage = {
  devDependencies: { 'vite-plus': '^0.1.0' },
  name: 'vp-managed',
  type: 'module',
};

describe('oxlint config validation', () => {
  test('generated oxlint.config.ts extends @xtarter/config by default', async () => {
    const testDir = fixtureDir('vite-plus-no-lint');
    const profile = await fixtureProfile('vite-plus-no-lint');
    const diffs = await run(oxlintTask.dryRun(testDir, profile));
    const configFile = diffs.find((d) => d.filepath === 'oxlint.config.ts');
    if (!configFile) {
      throw new Error('Expected oxlint.config.ts diff to exist');
    }
    expect(configFile.before).toBeNull();
    expect(configFile.after).toContain(
      'import core from "@xtarter/config/oxlint/core"'
    );
    expect(configFile.after).toContain(
      'import react from "@xtarter/config/oxlint/react"'
    );
    expect(configFile.after).toContain('extends: [core, react]');
    expect(configFile.after).not.toContain('ultracite');
    expect(configFile.after).not.toContain('rules');
    const deps = await run(oxlintTask.getDeps(testDir, profile));
    expect(deps.map((dep) => dep.depName)).toContain('@xtarter/config');
  });
});

describe('oxlint ejected config', () => {
  test('ejected oxlint.config.ts has expected imports and rules', async () => {
    const testDir = fixtureDir('vite-plus-no-lint');
    const profile = await fixtureProfile('vite-plus-no-lint');
    const diffs = await run(ejectedOxlintTask.dryRun(testDir, profile));
    const configFile = diffs.find((d) => d.filepath === 'oxlint.config.ts');
    if (!configFile) {
      throw new Error('Expected oxlint.config.ts diff to exist');
    }
    expect(configFile.before).toBeNull();

    const content = configFile.after;

    // Imports
    expect(content).toContain('import { defineConfig } from "oxlint"');
    expect(content).toContain('import core from "ultracite/oxlint/core"');

    // Core rules
    expect(content).toContain('"no-console"');
    expect(content).toContain('"no-shadow"');

    // Overrides
    expect(content).toContain('overrides');
    expect(content).toContain('"*.test.ts"');
    expect(content).toContain('"@typescript-eslint/no-explicit-any"');
    const deps = await run(ejectedOxlintTask.getDeps(testDir, profile));
    expect(deps.map((dep) => dep.depName)).not.toContain('@xtarter/config');
  });

  test('generated oxlint.config.json preserves existing settings', async () => {
    const testDir = fixtureDir('vite-plus-oxlint');
    const profile = await fixtureProfile('vite-plus-oxlint');
    const diffs = await run(oxlintTask.dryRun(testDir, profile));
    const configFile = diffs.find((d) => d.filepath === 'oxlint.config.json');
    if (!configFile) {
      throw new Error('Expected oxlint.config.json diff to exist');
    }

    const config = JSON.parse(configFile.after);
    expect(config.rules['no-console']).toBe('error');
    expect(config.rules['no-unused-vars']).toBe('off');
    expect(config.rules.complexity).toEqual(['warn', { max: 30 }]);
    expect(
      Array.isArray(config.rules['@typescript-eslint/consistent-type-imports'])
    ).toBe(true);
    expect(config.categories).toEqual({
      correctness: 'error',
      perf: 'warn',
      style: 'warn',
      suspicious: 'warn',
    });
    expect(config.overrides).toBeDefined();
    expect(config.overrides[0].files).toContain('*.test.ts');
  });

  test('ejected config includes ultracite react preset when framework is react', async () => {
    const testDir = fixtureDir('vite-plus-no-lint');
    const profile = await fixtureProfile('vite-plus-no-lint');
    const diffs = await run(ejectedOxlintTask.dryRun(testDir, profile));
    const configFile = diffs.find((d) => d.filepath === 'oxlint.config.ts');

    if (!configFile) {
      throw new Error('Expected oxlint.config.ts diff to exist');
    }
    const content = configFile.after;
    expect(content).toContain('import react from "ultracite/oxlint/react"');
    expect(content).toContain('extends: [core, react]');
  });
});

describe('oxlint managed config upkeep', () => {
  test('accepts a managed config that extends every detected layer', async () => {
    await withProject(
      {
        'oxlint.config.ts': `import { defineConfig } from "oxlint";
import core from "@xtarter/config/oxlint/core";

export default defineConfig({
  extends: [core],
  rules: { "no-alert": "off" },
});
`,
        'package.json': vitePlusPackage,
      },
      async ({ cwd, profile }) => {
        await expect(run(oxlintTask.check(cwd, profile))).resolves.not.toBe(
          'conflict'
        );
        const diffs = await run(oxlintTask.dryRun(cwd, profile));
        expect(diffs.every((d) => !d.after.includes('ultracite'))).toBe(true);
      }
    );
  });

  test('adds a newly detected layer to a managed config, keeping user rules', async () => {
    await withProject(
      {
        'oxlint.config.ts': `import { defineConfig } from "oxlint";
import core from "@xtarter/config/oxlint/core";

export default defineConfig({
  extends: [core],
  rules: { "no-alert": "off" },
});
`,
        'package.json': {
          ...vitePlusPackage,
          dependencies: { react: '^19.0.0' },
        },
      },
      async ({ cwd, profile }) => {
        await expect(run(oxlintTask.check(cwd, profile))).resolves.toBe(
          'patch'
        );
        const [diff] = await run(oxlintTask.dryRun(cwd, profile));
        expect(diff.after).toContain(
          'import react from "@xtarter/config/oxlint/react"'
        );
        expect(diff.after).toContain('extends: [core, react]');
        expect(diff.after).toContain('"no-alert": "off"');
      }
    );
  });

  test('keeps an ejected config ejected even without --eject', async () => {
    await withProject(
      {
        'oxlint.config.ts': `import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";

export default defineConfig({ extends: [core] });
`,
        'package.json': vitePlusPackage,
      },
      async ({ cwd, profile }) => {
        const diffs = await run(oxlintTask.dryRun(cwd, profile));
        expect(diffs).toEqual([]);
        const deps = await run(oxlintTask.getDeps(cwd, profile));
        expect(deps.map((dep) => dep.depName)).not.toContain('@xtarter/config');
      }
    );
  });
});

describe('oxfmt config validation', () => {
  test('generated oxfmt.config.ts spreads @xtarter/config by default', async () => {
    const testDir = fixtureDir('vite-plus-no-lint');
    const profile = await fixtureProfile('vite-plus-no-lint');
    const diffs = await run(oxfmtTask.dryRun(testDir, profile));
    const configFile = diffs.find((d) => d.filepath === 'oxfmt.config.ts');
    if (!configFile) {
      throw new Error('Expected oxfmt.config.ts diff to exist');
    }
    expect(configFile.after).toContain(
      'import xtarter from "@xtarter/config/oxfmt"'
    );
    expect(configFile.after).toContain('...xtarter,');
  });

  test('ejected oxfmt.config.ts has expected imports and options', async () => {
    const testDir = fixtureDir('vite-plus-no-lint');
    const profile = await fixtureProfile('vite-plus-no-lint');
    const diffs = await run(ejectedOxfmtTask.dryRun(testDir, profile));
    const configFile = diffs.find((d) => d.filepath === 'oxfmt.config.ts');

    if (!configFile) {
      throw new Error('Expected oxfmt.config.ts diff to exist');
    }
    expect(configFile.before).toBeNull();

    const content = configFile.after;
    expect(content).toContain('import { defineConfig } from "oxfmt"');
    expect(content).toContain('import ultracite from "ultracite/oxfmt"');
    expect(content).toContain('singleQuote: true');
  });

  test('accepts an existing managed oxfmt.config.ts as-is', async () => {
    await withProject(
      {
        'oxfmt.config.ts': `import xtarter from "@xtarter/config/oxfmt";

export default { ...xtarter, printWidth: 100 };
`,
        'package.json': vitePlusPackage,
      },
      async ({ cwd, profile }) => {
        const diffs = await run(oxfmtTask.dryRun(cwd, profile));
        expect(diffs).toEqual([]);
      }
    );
  });

  test('reports conflict when an existing oxfmt.config.ts differs from the template', async () => {
    await withProject(
      {
        'oxfmt.config.ts': 'export default {}\n',
        'package.json': {
          devDependencies: { 'vite-plus': '^0.1.0' },
          name: 'vp-oxfmt-status',
          type: 'module',
        },
      },
      async ({ cwd, profile }) => {
        await expect(run(oxfmtTask.check(cwd, profile))).resolves.toBe(
          'conflict'
        );
      }
    );
  });
});
