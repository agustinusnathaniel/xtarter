import {
  collectDependencyVersions,
  type Framework,
  type ProjectProfile,
} from '@xtarterize/core';
import type { PackageJson } from 'pkg-types';

import { defineTask, type TaskDep } from './define-task.js';
import {
  areEquivalent,
  extractTool,
  findEquivalentScriptKey,
} from './equivalence.js';
import {
  filterMissingScripts,
  hasInstalledDependency,
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
}

function resolveProjectLintConfig(
  pkg: PackageJson | null,
  profile: {
    existing: { eslint: boolean; oxlint: boolean; oxfmt: boolean };
    vitePlus: boolean;
    framework: Framework;
  }
): LintConfig {
  const deps = collectDependencyVersions(pkg);
  const hasBiomeDep = !!deps['@biomejs/biome'];
  const useUltracite = !!deps.ultracite;
  const oxlintPlugins = oxlintPluginFlags({ framework: profile.framework });
  const lintTool = resolveLintTool({
    existingEslint: profile.existing.eslint,
    existingOxfmt: profile.existing.oxfmt,
    existingOxlint: profile.existing.oxlint,
    hasBiomeDep,
    useUltracite,
    vitePlus: profile.vitePlus,
  });
  return { hasBiomeDep, lintTool, oxlintPlugins };
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

/** Command tools that satisfy a task whose script key may differ. */
const TOOL_TASK_NAMES: Record<string, string> = {
  jest: 'test',
  mocha: 'test',
  tsc: 'typecheck',
  vitest: 'test',
};

function firstScriptKey(
  existingScripts: Record<string, string>,
  task: string
): string | null {
  for (const [key, value] of Object.entries(existingScripts)) {
    const tool = extractTool(value);
    if (tool !== null && (TOOL_TASK_NAMES[tool] ?? tool) === task) {
      return key;
    }
  }
  return null;
}

function lintTurboTasks(
  tool: LintTool | null,
  existingScripts: Record<string, string>,
  typescript: boolean
): Array<string> {
  const lintKey = tool === 'vp' || tool === 'oxlint' ? 'lint' : tool;
  const baseTasks: Array<string> = lintKey
    ? [lintKey, 'typecheck', 'test']
    : ['typecheck', 'test'];
  const tasks: Array<string> = [];
  for (const task of baseTasks) {
    const mapped = firstScriptKey(existingScripts, task) ?? task;
    // The old composite filter dropped a mapped `typecheck` for non-TS
    // projects and the literal `ultracite` key, which no generated script uses.
    if (mapped === 'typecheck' && !typescript) {
      continue;
    }
    if (tool === 'ultracite' && mapped === lintKey) {
      continue;
    }
    tasks.push(mapped);
  }
  return tasks;
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

function pushIfMissing(
  scripts: Array<ScriptEntry>,
  existing: ScriptsMap,
  entry: ScriptEntry
): void {
  if (
    !(
      Object.hasOwn(existing, entry.script) ||
      findEquivalentScriptKey(existing, entry.value)
    )
  ) {
    scripts.push(entry);
  }
}

function collectScriptCandidates(params: {
  existingScripts: ScriptsMap;
  lintTool: LintTool | null;
  oxlintPlugins: string;
  pkg: PackageJson | null;
  profile: ProjectProfile;
  scripts: Array<ScriptEntry>;
}): void {
  const { existingScripts, pkg, profile, scripts } = params;
  const candidates: Array<ScriptEntry> = [
    ...lintToolScripts(params.lintTool, params.oxlintPlugins),
    { script: 'test', value: 'vitest run' },
    { script: 'upgrade', value: getUpgradeCommand(profile.packageManager) },
    ...(profile.existing.changeset
      ? [
          { script: 'changeset', value: 'changeset' },
          { script: 'version-packages', value: 'changeset version' },
          { script: 'release', value: 'changeset publish' },
        ]
      : [{ script: 'release', value: 'commit-and-tag-version' }]),
    { script: 'plop', value: 'plop' },
    ...(profile.typescript
      ? [
          { script: 'typecheck', value: 'tsc --noEmit' },
          { script: 'knip', value: 'knip' },
        ]
      : []),
  ];
  for (const entry of candidates) {
    pushIfMissing(scripts, existingScripts, entry);
  }

  const hasTurbo =
    profile.monorepoTool === 'turbo' ||
    profile.existing.turbo ||
    hasInstalledDependency(pkg, 'turborepo') ||
    hasInstalledDependency(pkg, 'turbo');
  if (!hasTurbo) {
    return;
  }
  const newCheckTurboValue = `turbo run ${lintTurboTasks(
    params.lintTool,
    existingScripts,
    profile.typescript
  ).join(' ')}`;
  const existingCheckTurbo = existingScripts['check:turbo'];
  if (
    !(
      existingCheckTurbo &&
      areEquivalent(existingCheckTurbo, newCheckTurboValue)
    )
  ) {
    scripts.push({ script: 'check:turbo', value: newCheckTurboValue });
  }
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

  collectScriptCandidates({
    existingScripts,
    lintTool,
    oxlintPlugins,
    pkg,
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
