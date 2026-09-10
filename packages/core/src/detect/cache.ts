import fs from 'node:fs/promises';
import { Effect } from 'effect';
import { dirname } from 'pathe';

import { FileSystemError } from '@/errors.js';
import { resolvePath } from '@/utils/fs.js';

import {
  ancestorMarkerInputs,
  configDirInputs,
  cwdMarkerInputs,
  lockfileInputs,
  packageJsonInput,
  rootFileInputs,
  workspacePackageDirs,
} from './registry/index.js';
import type { ProjectProfile } from './types.js';

export interface PathFingerprint {
  mtimeMs: number;
  path: string;
  size: number;
}

export interface ProjectFingerprint {
  ancestorInputs: Array<PathFingerprint>;
  configDirs: Array<PathFingerprint>;
  cwdInputs: Array<PathFingerprint>;
  lockfiles: Array<PathFingerprint>;
  packageJson: PathFingerprint;
  rootInputs: Array<PathFingerprint>;
}

export const PROFILE_CACHE_VERSION = 3;

export interface ProfileCacheEntry {
  computedAt: string;
  durationMs: number;
  fingerprint: ProjectFingerprint;
  profile: ProjectProfile;
  version: typeof PROFILE_CACHE_VERSION;
}

type PathKind = 'any' | 'file' | 'presence';

async function fingerprintPath(
  filePath: string,
  kind: PathKind
): Promise<PathFingerprint | null> {
  try {
    if (kind === 'presence') {
      await fs.access(filePath);
      return { mtimeMs: 0, path: filePath, size: 0 };
    }
    const s = await fs.stat(filePath);
    if (kind === 'file' && !s.isFile()) {
      return null;
    }
    return { mtimeMs: s.mtimeMs, path: filePath, size: s.size };
  } catch {
    return null;
  }
}

async function fingerprintPaths(
  paths: Array<string>,
  kind: PathKind
): Promise<Array<PathFingerprint>> {
  const fingerprints: Array<PathFingerprint> = [];
  for (const filePath of paths) {
    const fingerprint = await fingerprintPath(filePath, kind);
    if (fingerprint) {
      fingerprints.push(fingerprint);
    }
  }
  return fingerprints;
}

function fingerprintLockfiles(cwd: string): Promise<Array<PathFingerprint>> {
  return fingerprintPaths(
    lockfileInputs().map((input) => resolvePath(cwd, input.name)),
    'any'
  );
}

async function fingerprintConfigDirs(
  cwd: string
): Promise<Array<PathFingerprint>> {
  const results = await Promise.all(
    configDirInputs().map(async (input) => {
      const dirPath = resolvePath(cwd, input.dir);
      try {
        const entries = await fs.readdir(dirPath, {
          recursive: true,
          withFileTypes: true,
        });
        const entryStats: Array<PathFingerprint> = [];
        for (const entry of entries) {
          if (!entry.isFile()) {
            continue;
          }
          const fingerprint = await fingerprintPath(
            resolvePath(entry.parentPath ?? dirPath, entry.name),
            'any'
          );
          if (fingerprint) {
            entryStats.push(fingerprint);
          }
        }
        // If directory is empty, stat the directory itself so it still appears in the fingerprint
        if (entryStats.length === 0) {
          const fingerprint = await fingerprintPath(dirPath, 'any');
          if (fingerprint) {
            entryStats.push(fingerprint);
          }
        }
        return entryStats;
      } catch {
        return [] as Array<PathFingerprint>;
      }
    })
  );
  return results.flat();
}

function fingerprintRootInputs(cwd: string): Promise<Array<PathFingerprint>> {
  const paths = rootFileInputs().flatMap((input) => {
    const names =
      input.extensions.length === 0
        ? [input.basename]
        : input.extensions.map((ext) => `${input.basename}${ext}`);
    return names.map((name) => resolvePath(cwd, name));
  });
  return fingerprintPaths(paths, 'file');
}

async function fingerprintCwdInputs(
  cwd: string
): Promise<Array<PathFingerprint>> {
  const results = await Promise.all([
    fingerprintPaths(
      cwdMarkerInputs().map((input) => resolvePath(cwd, input.name)),
      'any'
    ),
    // Workspace dirs feed root-level monorepo detection, so their presence
    // matters but their contents do not. Presence-only entries keep dir
    // mtime churn from invalidating the cache.
    fingerprintPaths(
      workspacePackageDirs().map((dir) => resolvePath(cwd, dir)),
      'presence'
    ),
  ]);
  return results.flat();
}

async function fingerprintAncestorInputs(
  cwd: string
): Promise<Array<PathFingerprint>> {
  const names = ancestorMarkerInputs().map((input) => input.name);
  const rootMarkers = cwdMarkerInputs().map((input) => input.name);
  const entryStats: Array<PathFingerprint> = [];
  let current = dirname(cwd);
  while (current !== dirname(current)) {
    for (const name of names) {
      const fingerprint = await fingerprintPath(
        resolvePath(current, name),
        'presence'
      );
      if (fingerprint) {
        entryStats.push(fingerprint);
      }
    }
    let reachedRoot = false;
    for (const marker of rootMarkers) {
      const fingerprint = await fingerprintPath(
        resolvePath(current, marker),
        'presence'
      );
      if (fingerprint) {
        entryStats.push(fingerprint);
        reachedRoot = true;
        break;
      }
    }
    if (reachedRoot) {
      break;
    }
    current = dirname(current);
  }
  return entryStats;
}

export async function computeFingerprint(
  cwd: string
): Promise<ProjectFingerprint> {
  const pkgJsonPath = resolvePath(cwd, packageJsonInput().name);
  const [
    packageJson,
    lockfiles,
    configDirs,
    rootInputs,
    cwdInputs,
    ancestorInputs,
  ] = await Promise.all([
    fingerprintPath(pkgJsonPath, 'any'),
    fingerprintLockfiles(cwd),
    fingerprintConfigDirs(cwd),
    fingerprintRootInputs(cwd),
    fingerprintCwdInputs(cwd),
    fingerprintAncestorInputs(cwd),
  ]);

  return {
    ancestorInputs,
    configDirs,
    cwdInputs,
    lockfiles,
    packageJson: packageJson ?? {
      mtimeMs: 0,
      path: pkgJsonPath,
      size: 0,
    },
    rootInputs,
  };
}

function samePathFingerprint(
  stored: PathFingerprint,
  current: PathFingerprint
): boolean {
  return (
    stored.path === current.path &&
    stored.mtimeMs === current.mtimeMs &&
    stored.size === current.size
  );
}

export function isCacheValid(
  stored: ProfileCacheEntry,
  current: ProjectFingerprint
): boolean {
  if (stored.version !== PROFILE_CACHE_VERSION) {
    return false;
  }

  const s = stored.fingerprint;
  const c = current;

  if (!samePathFingerprint(s.packageJson, c.packageJson)) {
    return false;
  }

  return (
    samePathFingerprints(s.configDirs, c.configDirs) &&
    samePathFingerprints(s.lockfiles, c.lockfiles) &&
    samePathFingerprints(s.rootInputs, c.rootInputs) &&
    samePathFingerprints(s.cwdInputs, c.cwdInputs) &&
    samePathFingerprints(s.ancestorInputs, c.ancestorInputs)
  );
}

function samePathFingerprints(
  stored: Array<PathFingerprint>,
  current: Array<PathFingerprint>
): boolean {
  if (stored.length !== current.length) {
    return false;
  }

  const storedByPath = new Map(stored.map((d) => [d.path, d]));
  for (const fp of current) {
    const match = storedByPath.get(fp.path);
    if (!match || match.mtimeMs !== fp.mtimeMs || match.size !== fp.size) {
      return false;
    }
  }
  return true;
}

function cacheFilePath(cwd: string): string {
  return resolvePath(cwd, '.xtarterize', 'cache', 'profile-fingerprint.json');
}

export function readProfileCache(
  cwd: string
): Promise<ProfileCacheEntry | null> {
  return Effect.runPromise(
    Effect.tryPromise({
      catch: (cause) =>
        new FileSystemError({ cause, path: cacheFilePath(cwd) }),
      try: async () => {
        const content = await fs.readFile(cacheFilePath(cwd), 'utf-8');
        const parsed = JSON.parse(content) as unknown;
        if (!isValidCacheEntry(parsed)) {
          return null;
        }
        return parsed;
      },
    }).pipe(Effect.orElseSucceed(() => null))
  );
}

function isPathFingerprint(value: unknown): value is PathFingerprint {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const fp = value as Record<string, unknown>;
  return (
    typeof fp.path === 'string' &&
    typeof fp.mtimeMs === 'number' &&
    typeof fp.size === 'number'
  );
}

function isPathFingerprintArray(
  value: unknown
): value is Array<PathFingerprint> {
  return Array.isArray(value) && value.every(isPathFingerprint);
}

function isValidCacheEntry(value: unknown): value is ProfileCacheEntry {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const entry = value as Record<string, unknown>;
  if (entry.version !== PROFILE_CACHE_VERSION) {
    return false;
  }
  if (typeof entry.profile !== 'object' || entry.profile === null) {
    return false;
  }
  if (typeof entry.fingerprint !== 'object' || entry.fingerprint === null) {
    return false;
  }

  const fp = entry.fingerprint as Record<string, unknown>;
  if (!isPathFingerprint(fp.packageJson)) {
    return false;
  }
  return (
    isPathFingerprintArray(fp.configDirs) &&
    isPathFingerprintArray(fp.lockfiles) &&
    isPathFingerprintArray(fp.cwdInputs) &&
    isPathFingerprintArray(fp.rootInputs) &&
    isPathFingerprintArray(fp.ancestorInputs)
  );
}

export function writeProfileCache(
  cwd: string,
  entry: ProfileCacheEntry
): Promise<void> {
  return Effect.runPromise(
    Effect.gen(function* () {
      const filePath = cacheFilePath(cwd);
      const dir = dirname(filePath);
      yield* Effect.tryPromise(() =>
        fs.mkdir(dir, { recursive: true }).then(() => undefined)
      );

      const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
      const data = `${JSON.stringify(entry, null, 2)}\n`;

      yield* Effect.tryPromise(() => fs.writeFile(tempPath, data, 'utf-8'));

      yield* Effect.tryPromise(async () => {
        try {
          // Re-ensure dir exists (may have been cleaned up by parallel process)
          await fs.mkdir(dir, { recursive: true });
          await fs.rename(tempPath, filePath);
        } catch (error) {
          await fs.unlink(tempPath).catch(() => {});
          throw error;
        }
      });
    })
  );
}
