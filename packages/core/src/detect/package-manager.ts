import { detectPackageManager as detectPM } from 'nypm';

import { fileExists, resolvePath } from '@/utils/fs.js';

import type { PackageManager } from './types.js';

/**
 * Type guard to check if a value is a Record
 * @param value - Value to check
 * @returns True if value is a Record<string, unknown>
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type guard to check if a value is a Record<string, string>
 * @param value - Value to check
 * @returns True if value is a Record<string, string>
 */
export function isStringRecord(
  value: unknown
): value is Record<string, string> {
  if (!isRecord(value)) {
    return false;
  }
  return Object.values(value).every((v): v is string => typeof v === 'string');
}

/** Lockfiles in the order the fallback checks them when nypm finds nothing. */
export const LOCKFILES: ReadonlyArray<readonly [string, PackageManager]> = [
  ['bun.lockb', 'bun'],
  ['bun.lock', 'bun'],
  ['pnpm-lock.yaml', 'pnpm'],
  ['yarn.lock', 'yarn'],
  ['package-lock.json', 'npm'],
];

/**
 * Detects the package manager from lockfiles or nypm
 * @param cwd - Current working directory
 * @returns Detected package manager
 */
export async function detectPackageManager(
  cwd: string
): Promise<PackageManager> {
  const detected = await detectPM(cwd);
  if (
    detected?.name === 'npm' ||
    detected?.name === 'pnpm' ||
    detected?.name === 'yarn' ||
    detected?.name === 'bun'
  ) {
    return detected.name;
  }

  for (const [lockfile, packageManager] of LOCKFILES) {
    if (await fileExists(resolvePath(cwd, lockfile))) {
      return packageManager;
    }
  }

  return 'npm';
}
