import type { Framework, ProjectProfile } from '@xtarterize/core';
import type { PackageJson } from 'pkg-types';

import { defineTask, type TaskDep } from './define-task.js';
import {
  areEquivalent,
  extractTool,
  findEquivalentScriptKey,
} from './equivalence.js';
import {
  filterMissingScripts,
  readScriptsState,
  type ScriptEntry,
  type ScriptsMap,
  type ScriptsState,
  toScriptsPatch,
} from './scripts.js';

export type LintTool = 'ultracite' | 'biome' | 'oxlint' | 'vp';

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
    framework: Framework;
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

function oxlintPluginFlags(profile: { framework: Framework }): string {
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

interface PackageScriptsResolution extends ScriptsState {
  deps: Array<TaskDep>;
  missingScripts: Array<ScriptEntry>;
  patch: object;
}

/**
 * Dependencies are gated by the same missing-script resolution that produces
 * the diff: a script-linked dependency is only needed while its script is
 * missing. This matches the old `filterDepsByMissingScripts` behaviour.
 */
function resolvePackageScriptsDeps(
  pkg: PackageJson | null,
  profile: ProjectProfile,
  missingScripts: Array<ScriptEntry>
): Array<TaskDep> {
  const missing = new Set(missingScripts.map((s) => s.script));
  const { hasBiomeDep, lintTool } = resolveProjectLintConfig(pkg, profile);
  const deps: Array<TaskDep> = [];

  if (missing.has('test')) {
    deps.push({ depName: 'vitest', dev: true });
  }
  if (lintTool === 'biome' && !hasBiomeDep && missing.has('biome')) {
    deps.push({ depName: '@biomejs/biome', dev: true });
  }
  if (profile.typescript) {
    if (missing.has('typecheck')) {
      deps.push({ depName: 'typescript', dev: true });
    }
    if (missing.has('knip')) {
      deps.push({ depName: 'knip', dev: true });
    }
  }
  if (profile.existing.changeset) {
    if (missing.has('changeset')) {
      deps.push({ depName: '@changesets/cli', dev: true });
    }
  } else if (missing.has('release')) {
    deps.push({ depName: 'commit-and-tag-version', dev: true });
  }
  if (missing.has('plop')) {
    deps.push({ depName: 'plop', dev: true });
  }

  return deps;
}

/**
 * The single scripts resolution: status, diffs and dependencies all derive
 * from this result. The old `checkFn` only covered the core script groups, so
 * `check` could report `skip` while `getScripts` still had scripts to add.
 */
async function resolvePackageScripts(
  cwd: string,
  profile: ProjectProfile
): Promise<PackageScriptsResolution> {
  const state = await readScriptsState(cwd);
  const { existingScripts, pkg } = state;
  const { lintTool, oxlintPlugins } = resolveProjectLintConfig(pkg, profile);
  const scripts: Array<ScriptEntry> = [];

  addCoreScripts({
    existingScripts,
    lintTool,
    oxlintPlugins,
    pm: profile.packageManager,
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

  const missingScripts = filterMissingScripts(existingScripts, scripts);
  return {
    ...state,
    deps: resolvePackageScriptsDeps(pkg, profile, missingScripts),
    missingScripts,
    patch: toScriptsPatch(missingScripts),
  };
}

export const packageScriptsTask = defineTask({
  applicable: () => true,
  deps: async (_resolution, { cwd, profile }) =>
    (await resolvePackageScripts(cwd, profile)).deps,
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
  targets: async (cwd, profile) => {
    const { hasExistingScripts, missingScripts, patch } =
      await resolvePackageScripts(cwd, profile);
    return [
      {
        change: () => patch,
        kind: 'packageJson',
        // Old checkFn: with no existing scripts the whole change projected
        // `new`, otherwise `patch`.
        policy: () =>
          missingScripts.length > 0 && !hasExistingScripts ? 'new' : undefined,
      },
    ];
  },
});
