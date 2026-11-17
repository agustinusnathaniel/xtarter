import { mergeJson } from '@xtarterize/patchers';

import { type DefinedTask, defineTask } from '@/factory/define-task.js';
import { buildBiomeJson, managedBiomeExtends } from '@/templates/biome-json.js';

import {
  isManagedConfig,
  type LintTaskOptions,
  lintTaskDeps,
  newConfigForm,
} from './config-form.js';

const BIOME_FILE = { extensions: ['.json', '.jsonc'], filepath: 'biome.json' };

function extendsSharedConfig(
  config: object
): config is Record<string, unknown> {
  const entries = (config as { extends?: unknown }).extends;
  return (
    Array.isArray(entries) &&
    entries.some((entry) => typeof entry === 'string' && isManagedConfig(entry))
  );
}

/**
 * A managed config keeps whatever the user wrote; only shared entries that
 * detection selects and the file lacks are appended to `extends`.
 */
function mergeManagedExtends(
  existing: Record<string, unknown>,
  required: Array<string>
): object {
  const current = Array.isArray(existing.extends)
    ? (existing.extends as Array<unknown>)
    : [];
  const missing = required.filter((entry) => !current.includes(entry));
  return missing.length === 0
    ? existing
    : { ...existing, extends: [...current, ...missing] };
}

type RuleGroups = Record<string, Record<string, unknown> | undefined>;

/**
 * Biome 2.6 moved `useConsistentTestIt` from `nursery` to `style` and rejects
 * the old key, which earlier xtarterize versions wrote into test overrides.
 * Move it so upgraded ejected configs still load.
 */
function migrateNurseryTestIt(config: object): object {
  const { overrides } = config as { overrides?: unknown };
  if (!Array.isArray(overrides)) {
    return config;
  }
  let changed = false;
  const migrated = overrides.map((override: unknown) => {
    const rules = (override as { linter?: { rules?: RuleGroups } })?.linter
      ?.rules;
    const legacy = rules?.nursery?.useConsistentTestIt;
    if (!(rules && legacy !== undefined)) {
      return override;
    }
    changed = true;
    const { useConsistentTestIt: _moved, ...nursery } = rules.nursery ?? {};
    const { nursery: _legacy, ...otherGroups } = rules;
    const nextRules: RuleGroups = {
      ...otherGroups,
      ...(Object.keys(nursery).length > 0 ? { nursery } : {}),
      style: { useConsistentTestIt: legacy, ...rules.style },
    };
    const entry = override as { linter: Record<string, unknown> };
    return { ...entry, linter: { ...entry.linter, rules: nextRules } };
  });
  return changed ? { ...config, overrides: migrated } : config;
}

export function createBiomeTask(options: LintTaskOptions = {}): DefinedTask {
  return defineTask({
    applicable: (profile) =>
      !(
        profile.existing.eslint ||
        profile.existing.prettier ||
        profile.existing.oxlint ||
        profile.existing.oxfmt
      ) &&
      (profile.existing.biome || !profile.vitePlus),
    configTargets: ['biome.json', 'biome.jsonc'],
    deps: lintTaskDeps(
      [
        { depName: '@biomejs/biome', dev: true },
        { depName: 'ultracite', dev: true },
      ],
      () => BIOME_FILE
    ),
    group: 'Linting & Formatting',
    id: 'lint/biome',
    keywords: ['biome', 'linter', 'formatter', 'lint', 'format', 'all-in-one'],
    label: 'Biome (lint + format)',
    targets: (_cwd, profile) => [
      {
        ...BIOME_FILE,
        incoming: () => buildBiomeJson(profile, newConfigForm(options)),
        kind: 'jsonMerge',
        merge: (existing) =>
          extendsSharedConfig(existing)
            ? mergeManagedExtends(existing, managedBiomeExtends(profile))
            : migrateNurseryTestIt(
                mergeJson(existing, buildBiomeJson(profile, 'ejected'))
              ),
      },
    ],
  });
}

export const biomeTask = createBiomeTask();
