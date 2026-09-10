import {
  fileExists,
  readPackageJson as readCorePackageJson,
  readFile,
  resolvePath,
  writeFile,
} from '@xtarterize/core';
import { patchJson } from '@xtarterize/patchers';
import type { PackageJson } from 'pkg-types';

export const PACKAGE_JSON_FILENAME = 'package.json';

export interface PackageJsonChange {
  after: string;
  before: string | null;
  filepath: string;
}

/**
 * Read package.json fresh. No second parser and no cache, so writes made by
 * external writers such as the package manager are always visible.
 */
export function readPackageJson(cwd: string): Promise<PackageJson | null> {
  return readCorePackageJson(cwd);
}

/**
 * Read the current package.json text, or null when the file is absent. Used
 * when a no-op change still needs the text it was compared against.
 */
export async function readPackageJsonText(cwd: string): Promise<string | null> {
  const absolutePath = resolvePath(cwd, PACKAGE_JSON_FILENAME);
  return (await fileExists(absolutePath)) ? readFile(absolutePath) : null;
}

/**
 * Compute a package.json change from a JSON merge patch against the current
 * file text, so comments, indentation, key order, and trailing whitespace
 * survive. Returns null when the patch changes nothing.
 */
export async function computePackageJsonChange(
  cwd: string,
  patch: object
): Promise<PackageJsonChange | null> {
  const absolutePath = resolvePath(cwd, PACKAGE_JSON_FILENAME);
  const exists = await fileExists(absolutePath);
  if (!exists) {
    return {
      after: JSON.stringify(patch, null, 2),
      before: null,
      filepath: PACKAGE_JSON_FILENAME,
    };
  }

  const before = await readFile(absolutePath);
  const after = patchJson(before, patch);
  if (after === before) {
    return null;
  }
  return { after, before, filepath: PACKAGE_JSON_FILENAME };
}

/**
 * Apply a package.json change, recomputing it against the current file text
 * so an external writer active since compute is not overwritten.
 */
export async function applyPackageJsonChange(
  cwd: string,
  patch: object
): Promise<PackageJsonChange | null> {
  const change = await computePackageJsonChange(cwd, patch);
  if (change === null) {
    return null;
  }
  await writeFile(resolvePath(cwd, change.filepath), change.after);
  return change;
}
