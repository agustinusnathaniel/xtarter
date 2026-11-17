import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import {
  type FixtureName,
  fixtureDir,
  fixtureProfile,
  withProject,
} from '@test/helpers/project.js';
import { run } from '@test/helpers/run.js';
import type { ProjectProfile } from '@xtarterize/core';
import { describe, expect } from 'vite-plus/test';

import {
  createOxfmtTask,
  createOxlintTask,
  oxfmtTask,
  oxlintTask,
} from '../../packages/tasks/src/lint/oxlint.js';

const ejectedOxlintTask = createOxlintTask({ eject: true });
const ejectedOxfmtTask = createOxfmtTask({ eject: true });

/**
 * The standalone config files apply when the project already has one: the
 * generated scripts then call Oxlint and Oxfmt directly. Without one, a Vite+
 * project gets `lint` and `fmt` blocks in vite.config instead.
 */
async function standaloneProfile(name: FixtureName): Promise<ProjectProfile> {
  const profile = await fixtureProfile(name);
  return {
    ...profile,
    existing: { ...profile.existing, oxfmt: true, oxlint: true },
  };
}

const vitePlusPackage = {
  devDependencies: { 'vite-plus': '^0.1.0' },
  name: 'vp-managed',
  type: 'module',
};

describe('oxlint config validation', () => {
  test('generated oxlint.config.ts extends @xtarter/config by default', async () => {
    const testDir = fixtureDir('vite-plus-no-lint');
    const profile = await standaloneProfile('vite-plus-no-lint');
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
    const profile = await standaloneProfile('vite-plus-no-lint');
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
    const profile = await standaloneProfile('vite-plus-oxlint');
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
    const profile = await standaloneProfile('vite-plus-no-lint');
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
    const profile = await standaloneProfile('vite-plus-no-lint');
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
    const profile = await standaloneProfile('vite-plus-no-lint');
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

const viteConfigWithPlugin = `import { defineConfig } from 'vite-plus';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
`;

/** Read the project's vite.config.ts after the tasks applied. */
function readViteConfig(cwd: string): Promise<string> {
  return readFile(join(cwd, 'vite.config.ts'), 'utf8');
}

describe('Vite+ lint and fmt blocks', () => {
  test('creates vite.config.ts with managed blocks when there is none', async () => {
    await withProject(
      { 'package.json': vitePlusPackage },
      async ({ cwd, profile }) => {
        const [lint] = await run(oxlintTask.dryRun(cwd, profile));
        expect(lint.filepath).toBe('vite.config.ts');
        expect(lint.before).toBeNull();
        expect(lint.after).toContain("from 'vite-plus'");
        expect(lint.after).toContain(
          "import xtarterCore from '@xtarter/config/oxlint/core'"
        );
        expect(lint.after).toContain('extends: [xtarterCore]');
        const deps = await run(oxlintTask.getDeps(cwd, profile));
        expect(deps.map((dep) => dep.depName)).toContain('@xtarter/config');
      }
    );
  });

  test('adds both blocks to an existing config, then a second run is a no-op', async () => {
    await withProject(
      {
        'package.json': {
          ...vitePlusPackage,
          dependencies: { react: '^19.0.0' },
        },
        'vite.config.ts': viteConfigWithPlugin,
      },
      async ({ cwd, profile }) => {
        await expect(run(oxlintTask.check(cwd, profile))).resolves.toBe(
          'patch'
        );
        await run(oxlintTask.apply(cwd, profile));
        await run(oxfmtTask.apply(cwd, profile));
        const config = await readViteConfig(cwd);
        expect(config).toContain('plugins: [react()]');
        expect(config).toContain(
          "import xtarterReact from '@xtarter/config/oxlint/react'"
        );
        expect(config).toContain('extends: [xtarterCore, xtarterReact]');
        expect(config).toContain(
          "import xtarterFmt from '@xtarter/config/oxfmt'"
        );
        expect(config).toContain('...xtarterFmt');

        await expect(run(oxlintTask.dryRun(cwd, profile))).resolves.toEqual([]);
        await expect(run(oxfmtTask.dryRun(cwd, profile))).resolves.toEqual([]);
      }
    );
  });
});

describe('Vite+ ejected blocks', () => {
  test('ejected blocks inline the layer and skip the shared package', async () => {
    await withProject(
      {
        'package.json': vitePlusPackage,
        'vite.config.ts': viteConfigWithPlugin,
      },
      async ({ cwd, profile }) => {
        await run(ejectedOxlintTask.apply(cwd, profile));
        await run(ejectedOxfmtTask.apply(cwd, profile));
        const config = await readViteConfig(cwd);
        expect(config).toContain(
          "import ultraciteCore from 'ultracite/oxlint/core'"
        );
        expect(config).toContain('"no-console"');
        expect(config).toMatch(/import ultraciteFmt from .ultracite\/oxfmt./u);
        expect(config).toContain('singleQuote: true');
        expect(config).not.toContain('@xtarter/config');

        // Without --eject, an ejected block stays ejected.
        await expect(run(oxlintTask.dryRun(cwd, profile))).resolves.toEqual([]);
        const deps = await run(oxfmtTask.getDeps(cwd, profile));
        expect(deps.map((dep) => dep.depName)).not.toContain('@xtarter/config');
      }
    );
  });
});

describe('Vite+ block upkeep', () => {
  test('adds a newly detected layer to a managed lint block', async () => {
    await withProject(
      {
        'package.json': {
          ...vitePlusPackage,
          dependencies: { react: '^19.0.0' },
        },
        'vite.config.ts': `import xtarterCore from '@xtarter/config/oxlint/core';
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: { extends: [xtarterCore], rules: { 'no-alert': 'off' } },
});
`,
      },
      async ({ cwd, profile }) => {
        await expect(run(oxlintTask.check(cwd, profile))).resolves.toBe(
          'patch'
        );
        const [diff] = await run(oxlintTask.dryRun(cwd, profile));
        expect(diff.after).toContain('extends: [xtarterCore, xtarterReact]');
        expect(diff.after).toContain("'no-alert': 'off'");
      }
    );
  });

  test("reports conflict for the project's own fmt block", async () => {
    await withProject(
      {
        'package.json': vitePlusPackage,
        'vite.config.ts': `import { defineConfig } from 'vite-plus';

export default defineConfig({ fmt: { printWidth: 100 } });
`,
      },
      async ({ cwd, profile }) => {
        await expect(run(oxfmtTask.check(cwd, profile))).resolves.toBe(
          'conflict'
        );
      }
    );
  });
});

const configDist = fileURLToPath(
  new URL('../../packages/config/dist/', import.meta.url)
);
const configBin = fileURLToPath(
  new URL('../../packages/config/node_modules/.bin/', import.meta.url)
);

const unsortedImports = `import { z } from './z';
import a from '@/a';
import fs from 'node:fs';
import React from 'react';
import { b } from '../b';
import x from '#x';
import type { T } from 'zod';
import y from '~/y';
import { Effect } from 'effect';

export const all = [z, a, fs, React, b, x, y, Effect] as Array<T>;
`;

const groupedImports = `import fs from 'node:fs';
import { Effect } from 'effect';
import React from 'react';
import type { T } from 'zod';

import x from '#x';
import a from '@/a';
import y from '~/y';

import { b } from '../b';
import { z } from './z';

export const all = [z, a, fs, React, b, x, y, Effect] as Array<T>;
`;

/** Formats the sample with one tool in a fresh directory and returns the result. */
async function formatSample(
  config: { file: string; content: string },
  args: Array<string>
): Promise<string> {
  const cwd = await mkdtemp(join(tmpdir(), 'xtarter-import-sort-'));
  try {
    await writeFile(join(cwd, config.file), config.content);
    await writeFile(join(cwd, 'sample.ts'), unsortedImports);
    // Under Vite+ (VP_VERSION set by `vp test`), oxfmt reads only vite.config.ts.
    // Unset it so oxfmt finds oxfmt.config.ts as in a standalone install.
    await promisify(execFile)(join(configBin, args[0]), args.slice(1), {
      cwd,
      env: { ...process.env, VP_VERSION: undefined },
    });
    return await readFile(join(cwd, 'sample.ts'), 'utf8');
  } finally {
    await rm(cwd, { force: true, recursive: true });
  }
}

describe('@xtarter/config import sorting', () => {
  test('Oxfmt groups imports the way Biome does', async () => {
    const biome = await formatSample(
      {
        content: JSON.stringify({
          extends: [join(configDist, 'biome/core.jsonc')],
        }),
        file: 'biome.json',
      },
      [
        'biome',
        'check',
        '--write',
        '--vcs-enabled=false',
        '--linter-enabled=false',
        'sample.ts',
      ]
    );
    const oxfmt = await formatSample(
      {
        content: `import xtarter from ${JSON.stringify(join(configDist, 'oxfmt/index.mjs'))};\nexport default xtarter;\n`,
        file: 'oxfmt.config.ts',
      },
      ['oxfmt', 'sample.ts']
    );

    expect(biome).toBe(groupedImports);
    expect(oxfmt).toBe(groupedImports);
  });
});
