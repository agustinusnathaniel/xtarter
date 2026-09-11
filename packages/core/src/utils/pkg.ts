import { addDependency } from 'nypm';
import { readPackageJSON } from 'pkg-types';

import {
  detectPackageManager,
  isStringRecord,
} from '@/detect/package-manager.js';
import { fileExists, resolvePath } from '@/utils/fs.js';

export async function isPnpmWorkspace(cwd: string): Promise<boolean> {
  return fileExists(resolvePath(cwd, 'pnpm-workspace.yaml'));
}

export async function readPackageJson(cwd: string) {
  const pkgPath = resolvePath(cwd, 'package.json');
  const exists = await fileExists(pkgPath);
  if (!exists) {
    return null;
  }
  return readPackageJSON(pkgPath);
}

/** Read package.json, treating read or parse failures as `null`. */
export async function readPackageJsonOrNull(cwd: string) {
  try {
    return await readPackageJson(cwd);
  } catch {
    return null;
  }
}

/**
 * Merge `dependencies` and `devDependencies` into one flat version record.
 * Malformed records whose values are not strings are ignored.
 */
export function collectDependencyVersions(
  pkg: {
    dependencies?: unknown;
    devDependencies?: unknown;
  } | null
): Record<string, string> {
  const deps: Record<string, string> = {};
  if (pkg && isStringRecord(pkg.dependencies)) {
    Object.assign(deps, pkg.dependencies);
  }
  if (pkg && isStringRecord(pkg.devDependencies)) {
    Object.assign(deps, pkg.devDependencies);
  }
  return deps;
}

export function hasDependency(
  pkg: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  },
  name: string
): boolean {
  return !!(pkg.dependencies?.[name] || pkg.devDependencies?.[name]);
}

/**
 * Install a dependency via the project's package manager.
 *
 * Skips installation if the dependency already exists in package.json.
 * Throws if the `nypm` addDependency call fails (network error, resolution
 * failure, permissions, etc.).
 *
 * @throws {Error} With a message including the dependency name and underlying error.
 */
export interface DepToInstall {
  depName: string;
  dev: boolean;
}

/**
 * Install multiple dependencies in batches.
 *
 * Groups dependencies by dev/prod and installs each group in a single
 * `nypm addDependency` call, reducing the number of spawned package
 * manager subprocesses.
 *
 * Skips dependencies already present in package.json.
 */
export async function installDependenciesBatch(
  cwd: string,
  deps: Array<DepToInstall>,
  options?: { silent?: boolean }
): Promise<void> {
  if (deps.length === 0) {
    return;
  }

  // Filter out already-installed deps
  const pkg = await readPackageJson(cwd);
  const missing = deps.filter(
    (d) =>
      !(pkg?.devDependencies?.[d.depName] || pkg?.dependencies?.[d.depName])
  );
  if (missing.length === 0) {
    return;
  }

  const workspace = await isPnpmWorkspace(cwd);
  const packageManager = await detectPackageManager(cwd);
  const groups = [
    { dev: true, label: 'Failed to install dev dependencies' },
    { dev: false, label: 'Failed to install dependencies' },
  ];

  const errors: Array<string> = [];
  for (const { dev, label } of groups) {
    const names = missing.filter((d) => d.dev === dev).map((d) => d.depName);
    if (names.length === 0) {
      continue;
    }
    try {
      await addDependency(names, {
        cwd,
        dev,
        packageManager,
        silent: options?.silent,
        workspace,
      });
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : String(cause);
      errors.push(`${label}: ${msg}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
}
