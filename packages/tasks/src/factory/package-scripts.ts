import { readPackageJson } from '@xtarterize/core';

import {
  areEquivalent,
  extractTool,
  findEquivalentScriptKey,
} from './equivalence.js';
import type { PackageJsonTaskDep } from './task.js';
import { createPackageJsonTask } from './task.js';

export type LintTool = 'ultracite' | 'biome' | 'oxlint' | 'vp';

export type ScriptEntry = { script: string; value: string };

export function resolveLintTool(params: {
  existingEslint: boolean;
  useUltracite: boolean;
  hasBiomeDep: boolean;
  existingOxlint: boolean;
  existingOxfmt: boolean;
  vitePlus: boolean;
}): LintTool | null {
  if (params.existingEslint) {
    return null;
  }
  if (params.useUltracite) {
    return 'ultracite';
  }
  if (params.hasBiomeDep) {
    return 'biome';
  }
  if (params.existingOxlint || params.existingOxfmt) {
    return 'oxlint';
  }
  if (params.vitePlus) {
    return 'vp';
  }
  return 'biome';
}

export interface LintConfig {
  hasBiomeDep: boolean;
  lintTool: LintTool | null;
  oxlintPlugins: string;
  useUltracite: boolean;
}

function resolveProjectLintConfig(
  pkg: Record<string, unknown> | null,
  profile: {
    existing: { eslint: boolean; oxlint: boolean; oxfmt: boolean };
    vitePlus: boolean;
    framework: import('@xtarterize/core').Framework;
  }
): LintConfig {
  const pkgDeps =
    (pkg?.dependencies as Record<string, string> | undefined) ?? {};
  const pkgDevDeps =
    (pkg?.devDependencies as Record<string, string> | undefined) ?? {};
  const hasBiomeDep = !!(
    pkgDevDeps['@biomejs/biome'] ?? pkgDeps['@biomejs/biome']
  );
  const useUltracite = !!(pkgDevDeps.ultracite ?? pkgDeps.ultracite);
  const oxlintPlugins = oxlintPluginFlags({ framework: profile.framework });
  const lintTool = resolveLintTool({
    existingEslint: profile.existing.eslint,
    existingOxfmt: profile.existing.oxfmt,
    existingOxlint: profile.existing.oxlint,
    hasBiomeDep,
    useUltracite,
    vitePlus: profile.vitePlus,
  });
  return { hasBiomeDep, lintTool, oxlintPlugins, useUltracite };
}

export function lintToolScripts(
  tool: LintTool | null,
  oxlintPlugins: string
): Array<ScriptEntry> {
  switch (tool) {
    case 'ultracite':
      return [
        { script: 'ultracite:check', value: 'ultracite check' },
        { script: 'ultracite:fix', value: 'ultracite fix' },
      ];
    case 'biome':
      return [
        { script: 'biome', value: 'biome check .' },
        { script: 'biome:fix', value: 'biome check --write .' },
      ];
    case 'oxlint':
      return [
        { script: 'lint', value: `oxlint ${oxlintPlugins}` },
        {
          script: 'check',
          value: `oxlint ${oxlintPlugins} && oxfmt --check`,
        },
        {
          script: 'fix',
          value: `oxlint --fix ${oxlintPlugins} && oxfmt`,
        },
      ];
    case 'vp':
      return [
        { script: 'lint', value: 'vp lint' },
        { script: 'check', value: 'vp check' },
        { script: 'fix', value: 'vp check --fix' },
      ];
    default:
      return [];
  }
}

function lintTurboTasks(
  tool: LintTool | null,
  existingScripts: Record<string, string>,
  typescript: boolean
): Array<string> {
  const taskKey = tool === 'vp' || tool === 'oxlint' ? 'lint' : (tool ?? '');
  const baseTasks: Array<string> = tool
    ? [tool === 'vp' || tool === 'oxlint' ? 'lint' : tool, 'typecheck', 'test']
    : ['typecheck', 'test'];

  let recommendedKeys: Array<string>;
  if (!tool) {
    recommendedKeys = ['typecheck', 'test'];
  } else if (tool === 'ultracite') {
    recommendedKeys = ['ultracite:check'];
  } else {
    recommendedKeys = baseTasks;
  }

  return getCompositeTasks(existingScripts, baseTasks).filter((t) => {
    if (t === 'typecheck' && !typescript) {
      return false;
    }
    if (taskKey && t === taskKey && !recommendedKeys.includes(taskKey)) {
      return false;
    }
    return true;
  });
}

function oxlintPluginFlags(profile: {
  framework: import('@xtarterize/core').Framework;
}): string {
  const plugins = ['--import-plugin'];
  if (profile.framework === 'react') {
    plugins.push('--react-plugin', '--jsx-a11y-plugin');
  }
  return plugins.join(' ');
}

function getUpgradeCommand(pm: string): string {
  switch (pm) {
    case 'pnpm':
      return 'pnpm up -i -L';
    case 'yarn':
      return 'yarn upgrade-interactive --latest';
    case 'npm':
      return 'npx npm-check-updates -i';
    case 'bun':
      return 'bun update';
    default:
      return 'npx npm-check-updates -i';
  }
}

type ScriptsMap = Record<string, string>;

function toScriptsMap(raw: Record<string, unknown>): ScriptsMap {
  const mapped: ScriptsMap = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value !== undefined) {
      mapped[key] = value as string;
    }
  }
  return mapped;
}

function addCoreScripts(params: {
  existingScripts: ScriptsMap;
  lintTool: LintTool | null;
  oxlintPlugins: string;
  pm: string;
  scripts: Array<ScriptEntry>;
}): void {
  pushAllIfMissing(
    params.scripts,
    params.existingScripts,
    lintToolScripts(params.lintTool, params.oxlintPlugins)
  );
  pushIfMissing(params.scripts, params.existingScripts, {
    script: 'test',
    value: 'vitest run',
  });
  pushIfMissing(params.scripts, params.existingScripts, {
    script: 'upgrade',
    value: getUpgradeCommand(params.pm),
  });
}

function addReleaseScripts(params: {
  existingScripts: ScriptsMap;
  hasChangeset: boolean;
  scripts: Array<ScriptEntry>;
}): void {
  if (params.hasChangeset) {
    pushAllIfMissing(params.scripts, params.existingScripts, [
      { script: 'changeset', value: 'changeset' },
      { script: 'version-packages', value: 'changeset version' },
      { script: 'release', value: 'changeset publish' },
    ]);
  } else {
    pushIfMissing(params.scripts, params.existingScripts, {
      script: 'release',
      value: 'commit-and-tag-version',
    });
  }
}

function addTypescriptScripts(params: {
  existingScripts: ScriptsMap;
  scripts: Array<ScriptEntry>;
  typescript: boolean;
}): void {
  if (params.typescript) {
    pushIfMissing(params.scripts, params.existingScripts, {
      script: 'typecheck',
      value: 'tsc --noEmit',
    });
    pushIfMissing(params.scripts, params.existingScripts, {
      script: 'knip',
      value: 'knip',
    });
  }
}

function addTurboScript(params: {
  existingScripts: ScriptsMap;
  lintTool: LintTool | null;
  pkg: Record<string, unknown> | null;
  profile: {
    existing: { turbo: boolean };
    monorepoTool: string | null;
    typescript: boolean;
  };
  scripts: Array<ScriptEntry>;
}): void {
  const hasTurbo =
    params.profile.monorepoTool === 'turbo' ||
    params.profile.existing.turbo ||
    !!(params.pkg?.devDependencies as Record<string, string> | undefined)
      ?.turborepo ||
    !!(params.pkg?.devDependencies as Record<string, string> | undefined)
      ?.turbo;
  if (hasTurbo) {
    const turboTasks = lintTurboTasks(
      params.lintTool,
      params.existingScripts,
      params.profile.typescript
    );
    const existingCheckTurbo = params.existingScripts['check:turbo'];
    const newCheckTurboValue = `turbo run ${turboTasks.join(' ')}`;
    if (
      !(
        existingCheckTurbo &&
        areEquivalent(existingCheckTurbo, newCheckTurboValue)
      )
    ) {
      params.scripts.push({ script: 'check:turbo', value: newCheckTurboValue });
    }
  }
}

function pushIfMissing(
  scripts: Array<ScriptEntry>,
  existing: ScriptsMap,
  entry: ScriptEntry
): void {
  if (
    !(
      Object.hasOwn(existing, entry.script) ||
      findEquivalentScriptKey(existing, entry.script, entry.value)
    )
  ) {
    scripts.push(entry);
  }
}

function pushAllIfMissing(
  scripts: Array<ScriptEntry>,
  existing: ScriptsMap,
  entries: Array<ScriptEntry>
): void {
  for (const entry of entries) {
    pushIfMissing(scripts, existing, entry);
  }
}

function getCompositeTasks(
  existingScripts: Record<string, string>,
  recommendedKeys: Array<string>
): Array<string> {
  const tasks: Array<string> = [];
  for (const key of recommendedKeys) {
    let foundKey: string | null = null;
    for (const [existingKey, existingValue] of Object.entries(
      existingScripts
    )) {
      if (extractTool(existingValue) === key) {
        foundKey = existingKey;
        break;
      }
    }
    tasks.push(foundKey ?? key);
  }
  return tasks;
}

export const packageScriptsTask = createPackageJsonTask({
  applicable: () => true,
  async checkFn(_cwd, profile, pkg) {
    const existingScripts = (pkg.scripts as Record<string, string>) ?? {};
    const hasExistingScripts = Object.keys(existingScripts).length > 0;
    const scriptsMap = toScriptsMap(
      existingScripts as unknown as Record<string, unknown>
    );
    const { lintTool, oxlintPlugins } = resolveProjectLintConfig(pkg, profile);
    const scripts: Array<ScriptEntry> = [];
    addCoreScripts({
      existingScripts: scriptsMap,
      lintTool,
      oxlintPlugins,
      pm: profile.packageManager,
      scripts,
    });
    if (scripts.length === 0) {
      return 'skip';
    }
    return hasExistingScripts ? 'patch' : 'new';
  },
  getDeps: async (cwd, profile) => {
    const deps: Array<PackageJsonTaskDep> = [];

    deps.push({ depName: 'vitest', installDev: true, script: 'test' });

    const pkg = await readPackageJson(cwd);
    const { lintTool } = resolveProjectLintConfig(pkg, profile);
    if (
      lintTool === 'biome' &&
      !(
        pkg?.devDependencies?.['@biomejs/biome'] ??
        pkg?.dependencies?.['@biomejs/biome']
      )
    ) {
      deps.push({
        depName: '@biomejs/biome',
        installDev: true,
        script: 'biome',
      });
    }

    if (profile.typescript) {
      deps.push({
        depName: 'typescript',
        installDev: true,
        script: 'typecheck',
      });
      deps.push({ depName: 'knip', installDev: true, script: 'knip' });
    }

    if (profile.existing.changeset) {
      deps.push({
        depName: '@changesets/cli',
        installDev: true,
        script: 'changeset',
      });
    } else {
      deps.push({
        depName: 'commit-and-tag-version',
        installDev: true,
        script: 'release',
      });
    }

    deps.push({ depName: 'plop', installDev: true, script: 'plop' });

    return deps;
  },
  getScripts: async (cwd, profile) => {
    const pm = profile.packageManager;
    const pkg = await readPackageJson(cwd);
    const existingScripts = toScriptsMap(
      (pkg?.scripts as Record<string, unknown>) ?? {}
    );
    const { lintTool, oxlintPlugins } = resolveProjectLintConfig(pkg, profile);
    const scripts: Array<ScriptEntry> = [];
    addCoreScripts({
      existingScripts,
      lintTool,
      oxlintPlugins,
      pm,
      scripts,
    });
    addReleaseScripts({
      existingScripts,
      hasChangeset: !!profile.existing.changeset,
      scripts,
    });
    pushIfMissing(scripts, existingScripts, { script: 'plop', value: 'plop' });
    addTypescriptScripts({
      existingScripts,
      scripts,
      typescript: !!profile.typescript,
    });
    addTurboScript({
      existingScripts,
      lintTool,
      pkg: pkg as Record<string, unknown> | null,
      profile,
      scripts,
    });
    return scripts;
  },
  group: 'Scripts',
  id: 'scripts/package-scripts',
  label: 'package.json scripts',
  scope: 'root',
  searchMeta: {
    configTargets: ['package.json'],
    keywords: [
      'scripts',
      'npm scripts',
      'package.json scripts',
      'task commands',
      'build scripts',
    ],
    tags: ['scripts', 'package.json', 'commands'],
  },
});
