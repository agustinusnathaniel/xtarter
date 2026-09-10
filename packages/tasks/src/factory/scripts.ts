import { hasDependency } from '@xtarterize/core';
import type { PackageJson } from 'pkg-types';

import {
  hasScriptWithEquivalentValue,
  type PackageScriptsMap,
} from './equivalence.js';
import { readPackageJson } from './package-json.js';

export interface ScriptEntry {
  script: string;
  value: string;
}

export type ScriptsMap = Record<string, string>;

export function toScriptsMap(raw: Record<string, unknown>): ScriptsMap {
  const mapped: ScriptsMap = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value !== undefined) {
      mapped[key] = value as string;
    }
  }
  return mapped;
}

export function filterMissingScripts(
  existing: PackageScriptsMap,
  candidates: Array<ScriptEntry>
): Array<ScriptEntry> {
  return candidates.filter((s) => {
    if (Object.hasOwn(existing, s.script)) {
      return false;
    }
    if (hasScriptWithEquivalentValue(existing, s.value)) {
      return false;
    }
    return true;
  });
}

/** package.json scripts plus the facts the old packageJson status used. */
export interface ScriptsState {
  existingScripts: ScriptsMap;
  hasExistingScripts: boolean;
  pkg: PackageJson | null;
}

export async function readScriptsState(cwd: string): Promise<ScriptsState> {
  const pkg = await readPackageJson(cwd);
  const existingScripts = toScriptsMap(
    (pkg?.scripts as Record<string, unknown> | undefined) ?? {}
  );
  return {
    existingScripts,
    hasExistingScripts: Object.keys(existingScripts).length > 0,
    pkg,
  };
}

export interface ScriptsResolution extends ScriptsState {
  missingScripts: Array<ScriptEntry>;
}

/** Read package.json once and project which candidates are still missing. */
export async function resolveScriptsResolution(
  cwd: string,
  candidates: Array<ScriptEntry>
): Promise<ScriptsResolution> {
  const state = await readScriptsState(cwd);
  return {
    ...state,
    missingScripts: filterMissingScripts(state.existingScripts, candidates),
  };
}

export function hasInstalledDependency(
  pkg: PackageJson | null,
  depName: string
): boolean {
  return pkg !== null && hasDependency(pkg, depName);
}

/** A package.json merge patch for the missing scripts, or `{}` when none. */
export function toScriptsPatch(missingScripts: Array<ScriptEntry>): object {
  if (missingScripts.length === 0) {
    return {};
  }
  const scripts: Record<string, string> = {};
  for (const entry of missingScripts) {
    scripts[entry.script] = entry.value;
  }
  return { scripts };
}
