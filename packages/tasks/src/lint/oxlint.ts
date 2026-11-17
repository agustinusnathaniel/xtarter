import { isDeepStrictEqual } from 'node:util';
import type { ProjectProfile } from '@xtarterize/core';
import {
  appendConfigArrayImports,
  mergeJson,
  parseJsonc,
} from '@xtarterize/patchers';

import {
  type DefinedTask,
  defineTask,
  type TargetPolicy,
} from '@/factory/define-task.js';
import {
  renderManagedOxfmtTsConfig,
  renderOxfmtTsConfig,
} from '@/templates/oxfmt-template.js';
import {
  managedOxlintImports,
  renderManagedOxlintTsConfig,
  renderOxlintJsonConfig,
  renderOxlintTsConfig,
} from '@/templates/oxlint-template.js';

import {
  isManagedConfig,
  type LintTaskOptions,
  lintTaskDeps,
  newConfigForm,
} from './config-form.js';

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

function renderOxlint(
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

export function createOxlintTask(options: LintTaskOptions = {}): DefinedTask {
  return defineTask({
    applicable: (profile) =>
      !(profile.existing.eslint || profile.existing.biome) &&
      (profile.vitePlus || profile.existing.oxlint),
    deps: lintTaskDeps(
      [
        { depName: 'oxlint', dev: true },
        { depName: 'ultracite', dev: true },
      ],
      OXLINT_FILE
    ),
    group: 'Linting & Formatting',
    id: 'lint/oxlint',
    keywords: ['oxlint', 'linter', 'rust', 'static analysis', 'fast'],
    label: 'Oxlint config',
    targets: [
      {
        ...OXLINT_FILE,
        kind: 'text',
        policy: oxlintPolicy,
        render: (profile, existing) => renderOxlint(profile, existing, options),
      },
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
  return defineTask({
    applicable: (profile) =>
      !(profile.existing.prettier || profile.existing.biome) &&
      (profile.vitePlus || profile.existing.oxfmt),
    deps: lintTaskDeps(
      [
        { depName: 'oxfmt', dev: true },
        { depName: 'ultracite', dev: true },
      ],
      OXFMT_FILE
    ),
    group: 'Linting & Formatting',
    id: 'lint/oxfmt',
    keywords: ['oxfmt', 'formatter', 'rust', 'format', 'style'],
    label: 'Oxfmt config',
    targets: [
      {
        ...OXFMT_FILE,
        kind: 'text',
        render: (_profile, existing) => renderOxfmt(existing, options),
      },
    ],
  });
}

export const oxlintTask = createOxlintTask();
export const oxfmtTask = createOxfmtTask();
