import fs from 'node:fs/promises';
import { join, normalize } from 'pathe';

import { BackupError } from '@/errors.js';
import { assertPathWithin, resolvePath } from '@/utils/fs.js';

const BACKUP_DIR = '.xtarterize/backups';

export interface Backup {
  backupPath: string;
  filepath: string;
  timestamp: string;
}

async function writeJsonAtomically(path: string, data: unknown): Promise<void> {
  const tempPath = `${path}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempPath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
  try {
    await fs.rename(tempPath, path);
  } catch (error) {
    await fs.unlink(tempPath).catch(() => {});
    throw error;
  }
}

async function readJsonOrNull<T>(path: string): Promise<T | null> {
  try {
    const content = await fs.readFile(path, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

export async function backupFile(cwd: string, filepath: string): Promise<void> {
  const sourcePath = resolvePath(cwd, filepath);
  const exists = await fs
    .access(sourcePath)
    .then(() => true)
    .catch(() => false);
  if (!exists) {
    return;
  }

  const backupDir = resolvePath(cwd, BACKUP_DIR);
  try {
    await fs.mkdir(backupDir, { recursive: true });
  } catch (cause) {
    throw new BackupError({ cause, path: backupDir });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeName = normalize(filepath)
    .replace(/_/g, '__') // escape underscore first
    .replace(/\//g, '_s') // slash → _s
    .replace(/\\/g, '_b'); // backslash → _b
  const backupName = `${safeName}.${timestamp}`;
  const backupPath = join(backupDir, backupName);

  try {
    await fs.cp(sourcePath, backupPath);
  } catch (cause) {
    throw new BackupError({ cause, path: sourcePath });
  }

  const indexPath = resolvePath(cwd, BACKUP_DIR, '.index.json');
  const indexContent =
    (await readJsonOrNull<Record<string, Array<Backup>>>(indexPath)) ?? {};
  const backups = indexContent[filepath] ?? [];
  backups.push({ backupPath, filepath, timestamp });
  indexContent[filepath] = backups;
  try {
    await writeJsonAtomically(indexPath, indexContent);
  } catch (cause) {
    throw new BackupError({ cause, path: indexPath });
  }
}

export function listBackups(
  cwd: string,
  filepath: string
): Promise<Array<Backup>> {
  const indexPath = resolvePath(cwd, BACKUP_DIR, '.index.json');
  return readJsonOrNull<Record<string, unknown>>(indexPath).then((index) => {
    const entries = index?.[filepath];
    if (!(entries && Array.isArray(entries))) {
      return [] as Array<Backup>;
    }
    return (entries as Array<unknown>)
      .filter(
        (entry): entry is Backup =>
          typeof entry === 'object' &&
          entry !== null &&
          typeof (entry as Backup).filepath === 'string' &&
          typeof (entry as Backup).backupPath === 'string' &&
          typeof (entry as Backup).timestamp === 'string'
      )
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  });
}

export async function restoreBackup(
  cwd: string,
  backup: Backup
): Promise<void> {
  if (!(backup.backupPath && backup.filepath)) {
    throw new BackupError({
      cause: new Error('Invalid backup: missing filepath or backupPath'),
      path: backup.backupPath ?? 'unknown',
    });
  }

  // Validate destination path is within the project directory
  let resolvedDest: string;
  try {
    resolvedDest = assertPathWithin(cwd, backup.filepath);
  } catch (cause) {
    throw new BackupError({ cause, path: backup.filepath });
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
    throw new BackupError({ cause, path: backup.backupPath });
  }

  try {
    await fs.cp(resolvedSource, resolvedDest);
  } catch (cause) {
    throw new BackupError({ cause, path: resolvedSource });
  }
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
  await writeJsonAtomically(manifestPath, manifest);
}

export async function readRunManifest(
  cwd: string
): Promise<RunManifest | null> {
  const manifestPath = resolvePath(cwd, BACKUP_DIR, 'last-run.json');
  return readJsonOrNull<RunManifest>(manifestPath);
}
