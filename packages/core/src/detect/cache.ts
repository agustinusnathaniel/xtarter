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

function statOrFail(
  filePath: string
): Effect.Effect<PathFingerprint, FileSystemError> {
  return Effect.tryPromise({
    catch: (cause) => new FileSystemError({ cause, path: filePath }),
    try: () =>
      fs.stat(filePath).then(
        (s) =>
          ({
            mtimeMs: s.mtimeMs,
            path: filePath,
            size: s.size,
          }) as PathFingerprint
      ),
  });
}

function statPath(
  filePath: string
): Effect.Effect<PathFingerprint | null, never> {
  return statOrFail(filePath).pipe(Effect.orElseSucceed(() => null));
}

function fingerprintLockfiles(
  cwd: string
): Effect.Effect<Array<PathFingerprint>, never> {
  return Effect.gen(function* () {
    const fingerprints: Array<PathFingerprint> = [];
    for (const input of lockfileInputs()) {
      const fingerprint = yield* statPath(resolvePath(cwd, input.name));
      if (fingerprint) {
        fingerprints.push(fingerprint);
      }
    }
    return fingerprints;
  });
}

function fingerprintConfigDirs(
  cwd: string
): Effect.Effect<Array<PathFingerprint>, never> {
  const dirs = configDirInputs().map((input) => input.dir);
  return Effect.tryPromise({
    catch: (cause) => new FileSystemError({ cause, path: cwd }),
    try: () =>
      Promise.all(
        dirs.map(async (dir) => {
          const dirPath = resolvePath(cwd, dir);
          try {
            const entries = await fs.readdir(dirPath, {
              recursive: true,
              withFileTypes: true,
            });
            const entryStats: Array<PathFingerprint> = [];
            for (const entry of entries) {
              if (entry.isFile()) {
                const parent =
                  (entry as unknown as { parentPath?: string; path?: string })
                    .parentPath ??
                  (entry as unknown as { parentPath?: string; path?: string })
                    .path ??
                  dirPath;
                const fullPath = resolvePath(String(parent), entry.name);
                const s = await fs.stat(fullPath);
                entryStats.push({
                  mtimeMs: s.mtimeMs,
                  path: fullPath,
                  size: s.size,
                });
              }
            }
            // If directory is empty, stat the directory itself so it still appears in the fingerprint
            if (entryStats.length === 0) {
              const s = await fs.stat(dirPath);
              entryStats.push({
                mtimeMs: s.mtimeMs,
                path: dirPath,
                size: s.size,
              });
            }
            return entryStats;
          } catch {
            return [] as Array<PathFingerprint>;
          }
        })
      ).then((results) => results.flat()),
  }).pipe(Effect.orElseSucceed(() => []));
}

function fingerprintRootInputs(
  cwd: string
): Effect.Effect<Array<PathFingerprint>, never> {
  return Effect.tryPromise({
    catch: (cause) => new FileSystemError({ cause, path: cwd }),
    try: async () => {
      const entryStats: Array<PathFingerprint> = [];
      for (const input of rootFileInputs()) {
        const names =
          input.extensions.length === 0
            ? [input.basename]
            : input.extensions.map((ext) => `${input.basename}${ext}`);
        for (const name of names) {
          const filePath = resolvePath(cwd, name);
          try {
            const s = await fs.stat(filePath);
            if (s.isFile()) {
              entryStats.push({
                mtimeMs: s.mtimeMs,
                path: filePath,
                size: s.size,
              });
            }
          } catch {
            // Absent or unreadable inputs simply don't contribute
          }
        }
      }
      return entryStats;
    },
  }).pipe(Effect.orElseSucceed(() => []));
}

function fingerprintCwdInputs(
  cwd: string
): Effect.Effect<Array<PathFingerprint>, never> {
  return Effect.tryPromise({
    catch: (cause) => new FileSystemError({ cause, path: cwd }),
    try: async () => {
      const entryStats: Array<PathFingerprint> = [];
      for (const input of cwdMarkerInputs()) {
        const inputPath = resolvePath(cwd, input.name);
        try {
          const s = await fs.stat(inputPath);
          entryStats.push({
            mtimeMs: s.mtimeMs,
            path: inputPath,
            size: s.size,
          });
        } catch {
          // Absent markers simply don't contribute
        }
      }
      // Workspace dirs feed root-level monorepo detection, so their presence
      // matters but their contents do not. Presence-only entries keep dir
      // mtime churn from invalidating the cache.
      for (const dir of workspacePackageDirs()) {
        const dirPath = resolvePath(cwd, dir);
        try {
          await fs.access(dirPath);
          entryStats.push({ mtimeMs: 0, path: dirPath, size: 0 });
        } catch {
          // Absent workspace dirs simply don't contribute
        }
      }
      return entryStats;
    },
  }).pipe(Effect.orElseSucceed(() => []));
}

function fingerprintAncestorInputs(
  cwd: string
): Effect.Effect<Array<PathFingerprint>, never> {
  const names = ancestorMarkerInputs().map((input) => input.name);
  const rootMarkers = cwdMarkerInputs().map((input) => input.name);
  return Effect.tryPromise({
    catch: (cause) => new FileSystemError({ cause, path: cwd }),
    try: async () => {
      const entryStats: Array<PathFingerprint> = [];
      let current = dirname(cwd);
      let reachedRoot = false;
      while (!reachedRoot && current !== dirname(current)) {
        for (const name of names) {
          const inputPath = resolvePath(current, name);
          try {
            await fs.access(inputPath);
            entryStats.push({ mtimeMs: 0, path: inputPath, size: 0 });
          } catch {
            // Absent inputs don't contribute
          }
        }
        for (const marker of rootMarkers) {
          const markerPath = resolvePath(current, marker);
          try {
            await fs.access(markerPath);
            entryStats.push({ mtimeMs: 0, path: markerPath, size: 0 });
            reachedRoot = true;
            break;
          } catch {
            // No marker here, keep walking up
          }
        }
        current = dirname(current);
      }
      return entryStats;
    },
  }).pipe(Effect.orElseSucceed(() => []));
}

export function computeFingerprint(cwd: string): Promise<ProjectFingerprint> {
  return Effect.runPromise(
    Effect.gen(function* () {
      const pkgJsonPath = resolvePath(cwd, packageJsonInput().name);
      const packageJson = yield* statPath(pkgJsonPath);
      const lockfiles = yield* fingerprintLockfiles(cwd);
      const configDirs = yield* fingerprintConfigDirs(cwd);
      const rootInputs = yield* fingerprintRootInputs(cwd);
      const cwdInputs = yield* fingerprintCwdInputs(cwd);
      const ancestorInputs = yield* fingerprintAncestorInputs(cwd);

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
    })
  );
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
