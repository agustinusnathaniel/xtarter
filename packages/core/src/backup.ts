import fs from 'node:fs/promises';
import { Effect } from 'effect';
import { join, normalize } from 'pathe';

import { BackupError } from '@/errors.js';
import { assertPathWithin, resolvePath } from '@/utils/fs.js';

const BACKUP_DIR = '.xtarterize/backups';

export interface Backup {
  backupPath: string;
  filepath: string;
  timestamp: string;
}

function tryIo<A>(
  path: string,
  f: () => Promise<A>
): Effect.Effect<A, BackupError> {
  return Effect.tryPromise({
    catch: (cause) => new BackupError({ cause, path }),
    try: (_signal) => f(),
  });
}

export function backupFile(cwd: string, filepath: string): Promise<void> {
  return Effect.runPromise(
    Effect.gen(function* () {
      const sourcePath = resolvePath(cwd, filepath);
      const exists = yield* tryIo(sourcePath, () =>
        fs
          .access(sourcePath)
          .then(() => true)
          .catch(() => false)
      );
      if (!exists) {
        return;
      }

      const backupDir = resolvePath(cwd, BACKUP_DIR);
      yield* tryIo(backupDir, () => fs.mkdir(backupDir, { recursive: true }));

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const safeName = normalize(filepath)
        .replace(/_/g, '__') // escape underscore first
        .replace(/\//g, '_s') // slash → _s
        .replace(/\\/g, '_b'); // backslash → _b
      const backupName = `${safeName}.${timestamp}`;
      const backupPath = join(backupDir, backupName);

      yield* tryIo(sourcePath, () => fs.cp(sourcePath, backupPath));

      const indexPath = resolvePath(cwd, BACKUP_DIR, '.index.json');
      const indexContent: Record<
        string,
        Array<Backup>
      > = yield* Effect.orElseSucceed(
        tryIo(indexPath, () =>
          fs.readFile(indexPath, 'utf-8').then((c) => JSON.parse(c))
        ),
        () => ({})
      );
      const backups = indexContent[filepath] ?? [];
      backups.push({ backupPath, filepath, timestamp });
      indexContent[filepath] = backups;
      yield* writeIndexAtomically(indexPath, indexContent);
    })
  );
}

function writeIndexAtomically(
  indexPath: string,
  indexContent: Record<string, Array<Backup>>
) {
  const tempPath = `${indexPath}.${process.pid}.${Date.now()}.tmp`;
  return tryIo(indexPath, async () => {
    await fs.writeFile(
      tempPath,
      `${JSON.stringify(indexContent, null, 2)}\n`,
      'utf-8'
    );
    try {
      await fs.rename(tempPath, indexPath);
    } catch (error) {
      await fs.unlink(tempPath).catch(() => {});
      throw error;
    }
  });
}

export function listBackups(
  cwd: string,
  filepath: string
): Promise<Array<Backup>> {
  const indexPath = resolvePath(cwd, BACKUP_DIR, '.index.json');
  return Effect.runPromise(
    Effect.orElseSucceed(
      tryIo(indexPath, async () => {
        const content = await fs.readFile(indexPath, 'utf-8');
        const index = JSON.parse(content) as Record<string, unknown>;
        if (!(index[filepath] && Array.isArray(index[filepath]))) {
          return [] as Array<Backup>;
        }
        return (index[filepath] as Array<unknown>)
          .filter(
            (entry): entry is Backup =>
              typeof entry === 'object' &&
              entry !== null &&
              typeof (entry as Backup).filepath === 'string' &&
              typeof (entry as Backup).backupPath === 'string' &&
              typeof (entry as Backup).timestamp === 'string'
          )
          .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      }),
      () => [] as Array<Backup>
    )
  );
}

export function restoreBackup(cwd: string, backup: Backup): Promise<void> {
  if (!(backup.backupPath && backup.filepath)) {
    return Promise.reject(
      new BackupError({
        cause: new Error('Invalid backup: missing filepath or backupPath'),
        path: backup.backupPath ?? 'unknown',
      })
    );
  }
  let resolvedDest: string;
  try {
    resolvedDest = assertPathWithin(cwd, backup.filepath);
  } catch (cause) {
    return Promise.reject(new BackupError({ cause, path: backup.filepath }));
  }

  // Validate source path (backupPath) is within the backup directory
  const backupDir = resolvePath(cwd, BACKUP_DIR);
  let resolvedSource: string;
  try {
    resolvedSource = assertPathWithin(
      backupDir,
      backup.backupPath,
      `Source path traversal detected: ${backup.backupPath}`
    );
  } catch (cause) {
    return Promise.reject(new BackupError({ cause, path: backup.backupPath }));
  }

  return Effect.runPromise(
    tryIo(resolvedSource, () => fs.cp(resolvedSource, resolvedDest))
  );
}

export interface RunManifest {
  files: Array<string>;
  timestamp: string;
}

export async function writeRunManifest(
  cwd: string,
  files: Array<string>
): Promise<void> {
  const manifestPath = resolvePath(cwd, BACKUP_DIR, 'last-run.json');
  const manifest: RunManifest = {
    files,
    timestamp: new Date().toISOString(),
  };
  await fs.mkdir(resolvePath(cwd, BACKUP_DIR), { recursive: true });
  const tempPath = `${manifestPath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(
    tempPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf-8'
  );
  try {
    await fs.rename(tempPath, manifestPath);
  } catch (error) {
    await fs.unlink(tempPath).catch(() => {});
    throw error;
  }
}

export async function readRunManifest(
  cwd: string
): Promise<RunManifest | null> {
  const manifestPath = resolvePath(cwd, BACKUP_DIR, 'last-run.json');
  try {
    const content = await fs.readFile(manifestPath, 'utf-8');
    return JSON.parse(content) as RunManifest;
  } catch {
    return null;
  }
}
