import { detectPackageManager as detectPM } from 'nypm';

import { fileExists, resolvePath } from '@/utils/fs.js';

import { inputById, type LockfileInput } from './registry/index.js';
import type { Framework, PackageManager } from './types.js';

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

/**
 * Lockfile fallback order when nypm cannot detect the package manager. The
 * names and package manager mappings come from the detection registry.
 */
const FALLBACK_LOCKFILE_IDS: ReadonlyArray<LockfileInput['id']> = [
  'bun-lockb',
  'bun-lock',
  'pnpm-lock',
  'yarn-lock',
  'npm-lock',
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

  // Fallback to lockfile detection if nypm fails
  for (const id of FALLBACK_LOCKFILE_IDS) {
    const input = inputById(id);
    if (input.kind !== 'lockfile') {
      continue;
    }
    if (await fileExists(resolvePath(cwd, input.name))) {
      return input.packageManager;
    }
  }

  return 'npm';
}

/**
 * Detects framework version from the merged dependency map.
 * @param deps - Dependency versions collected from package.json
 * @param framework - Detected framework
 * @returns Framework version string or null if not found
 */
export function detectFrameworkVersion(
  deps: Record<string, string>,
  framework: Framework
): string | null {
  const frameworkPkg =
    framework === 'react-native'
      ? (deps['react-native'] ?? deps.expo)
      : framework === 'node'
        ? null
        : framework
          ? deps[framework === 'solid' ? 'solid-js' : framework]
          : null;

  if (!frameworkPkg) {
    return null;
  }

  const cleaned = frameworkPkg.replace(/^[^0-9]*/, '');
  return cleaned || null;
}
