import { isDeepStrictEqual } from 'node:util';
import type { ProjectProfile } from '@xtarterize/core';
import {
  appendConfigArrayImports,
  mergeJson,
  parseJsonc,
} from '@xtarterize/patchers';

import type {
  DefinedTask,
  TargetPolicy,
  TaskTarget,
} from '@/factory/define-task.js';
import { defineTask } from '@/factory/define-task.js';
import type { LintTaskOptions } from '@/lint/config-form.js';
import {
  isManagedConfig,
  lintTaskDeps,
  newConfigForm,
} from '@/lint/config-form.js';
import type { VitePlusBlockSpec } from '@/lint/vite-plus-config.js';
import {
  classifyBlock,
  createVitePlusConfigTarget,
  usesVitePlusConfig,
  VITE_CONFIG_FILE,
} from '@/lint/vite-plus-config.js';
import {
  renderManagedOxfmtTsConfig,
  renderOxfmtTsConfig,
  vitePlusFmtBlock,
} from '@/templates/oxfmt-template.js';
import {
  LANDMINES_PACKAGE,
  managedOxlintImports,
  NEW_CONFIG_OXLINT_PRESET,
  renderManagedOxlintTsConfig,
  renderOxlintJsonConfig,
  renderOxlintTsConfig,
  VITE_PLUS_LINT_PREFIX,
  vitePlusLintBlock,
} from '@/templates/oxlint-template.js';

const ULTRACITE_OXLINT_MARKER = 'ultracite/oxlint/';
const SCRIPT_EXTENSIONS = ['.ts', '.js', '.mjs', '.json'];
const OXLINT_FILE = {
  extensions: SCRIPT_EXTENSIONS,
  filepath: 'oxlint.config',
};
const OXFMT_FILE = { extensions: SCRIPT_EXTENSIONS, filepath: 'oxfmt.config' };

function isJsonConfig(text: string): boolean {
  return text.trim().startsWith('{');
}

/** True when the config extends the landmines layer, shared or ejected. */
function usesLandmines(text: string): boolean {
  return text.includes(`/oxlint/${NEW_CONFIG_OXLINT_PRESET}`);
}

/**
 * JSON configs report `patch` only when the merge changes the parsed object.
 * Managed configs report `patch` when a detected layer is missing. Ejected
 * TypeScript configs that already extend Ultracite are accepted as-is.
 */
const oxlintPolicy: TargetPolicy = ({ before, after }) => {
  if (before === null) {
    return;
  }
  if (isJsonConfig(before)) {
    return isDeepStrictEqual(parseJsonc(before), parseJsonc(after))
      ? 'skip'
      : 'patch';
  }
  if (isManagedConfig(before)) {
    return before === after ? 'skip' : 'patch';
  }
  return before.includes(ULTRACITE_OXLINT_MARKER) ? 'skip' : undefined;
};

function renderOxlintStandalone(
  profile: ProjectProfile,
  existing: string | null,
  options: LintTaskOptions
): string {
  if (existing === null) {
    return newConfigForm(options) === 'managed'
      ? renderManagedOxlintTsConfig(profile)
      : renderOxlintTsConfig(profile);
  }
  if (isJsonConfig(existing)) {
    // Oxlint's JSON format cannot extend packages, so it stays ejected.
    const merged = mergeJson(
      parseJsonc(existing) as Record<string, unknown>,
      JSON.parse(renderOxlintJsonConfig(profile)) as Record<string, unknown>
    );
    return JSON.stringify(merged, null, 2);
  }
  if (isManagedConfig(existing)) {
    // An unpatchable shape keeps the file and leaves the layer to the user.
    return (
      appendConfigArrayImports(
        existing,
        'extends',
        managedOxlintImports(profile)
      ) ?? existing
    );
  }
  return renderOxlintTsConfig(profile);
}

const VITE_LINT_BLOCK: VitePlusBlockSpec = {
  ejectedMarker: ULTRACITE_OXLINT_MARKER,
  id: 'lint/oxlint',
  key: 'lint',
  render: vitePlusLintBlock,
  upkeep: (code, profile) =>
    appendConfigArrayImports(
      code,
      'lint.extends',
      managedOxlintImports(profile, VITE_PLUS_LINT_PREFIX)
    ),
};

const VITE_FMT_BLOCK: VitePlusBlockSpec = {
  ejectedMarker: 'ultracite/oxfmt',
  id: 'lint/oxfmt',
  key: 'fmt',
  render: (_profile, form) => vitePlusFmtBlock(form),
};

/** The file a task's dependencies are read from: `vite.config` under Vite+. */
function depsFile(
  standalone: { extensions: Array<string>; filepath: string },
  block: VitePlusBlockSpec
) {
  return (profile: ProjectProfile) =>
    usesVitePlusConfig(profile)
      ? {
          ...VITE_CONFIG_FILE,
          isManaged: (text: string) => classifyBlock(text, block) === 'managed',
        }
      : standalone;
}

function configTargets(standalone: string): Array<string> {
  return [
    ...SCRIPT_EXTENSIONS.map((extension) => `${standalone}${extension}`),
    'vite.config.ts',
  ];
}

export function createOxlintTask(options: LintTaskOptions = {}): DefinedTask {
  const standalone: TaskTarget = {
    ...OXLINT_FILE,
    kind: 'text',
    policy: oxlintPolicy,
    render: (profile, existing) =>
      renderOxlintStandalone(profile, existing, options),
  };
  const vitePlus = createVitePlusConfigTarget(VITE_LINT_BLOCK, options);
  return defineTask({
    applicable: (profile) =>
      !(profile.existing.eslint || profile.existing.biome) &&
      (profile.vitePlus || profile.existing.oxlint),
    configTargets: configTargets(OXLINT_FILE.filepath),
    deps: lintTaskDeps(
      [
        { depName: 'oxlint', dev: true },
        { depName: 'ultracite', dev: true },
      ],
      depsFile(OXLINT_FILE, VITE_LINT_BLOCK),
      [
        {
          dep: { depName: LANDMINES_PACKAGE, dev: true },
          when: usesLandmines,
        },
      ]
    ),
    group: 'Linting & Formatting',
    id: 'lint/oxlint',
    keywords: ['oxlint', 'linter', 'rust', 'static analysis', 'fast'],
    label: 'Oxlint config',
    targets: (_cwd, profile) => [
      usesVitePlusConfig(profile) ? vitePlus : standalone,
    ],
  });
}

function renderOxfmt(existing: string | null, options: LintTaskOptions) {
  if (existing === null) {
    return newConfigForm(options) === 'managed'
      ? renderManagedOxfmtTsConfig()
      : renderOxfmtTsConfig();
  }
  if (isJsonConfig(existing) || isManagedConfig(existing)) {
    return existing;
  }
  return renderOxfmtTsConfig();
}

export function createOxfmtTask(options: LintTaskOptions = {}): DefinedTask {
  const standalone: TaskTarget = {
    ...OXFMT_FILE,
    kind: 'text',
    render: (_profile, existing) => renderOxfmt(existing, options),
  };
  const vitePlus = createVitePlusConfigTarget(VITE_FMT_BLOCK, options);
  return defineTask({
    applicable: (profile) =>
      !(profile.existing.prettier || profile.existing.biome) &&
      (profile.vitePlus || profile.existing.oxfmt),
    configTargets: configTargets(OXFMT_FILE.filepath),
    deps: lintTaskDeps(
      [
        { depName: 'oxfmt', dev: true },
        { depName: 'ultracite', dev: true },
      ],
      depsFile(OXFMT_FILE, VITE_FMT_BLOCK)
    ),
    group: 'Linting & Formatting',
    id: 'lint/oxfmt',
    keywords: ['oxfmt', 'formatter', 'rust', 'format', 'style'],
    label: 'Oxfmt config',
    targets: (_cwd, profile) => [
      usesVitePlusConfig(profile) ? vitePlus : standalone,
    ],
  });
}

export const oxlintTask = createOxlintTask();
export const oxfmtTask = createOxfmtTask();
