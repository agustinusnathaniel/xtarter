import fs from "node:fs/promises";
import { join, normalize } from "pathe";
import { fileExists, resolvePath } from "@/utils/fs.js";

const BACKUP_DIR = ".xtarterize/backups";

async function writeIndexAtomically(
  indexPath: string,
  indexContent: Record<string, Backup[]>,
): Promise<void> {
  const tempPath = `${indexPath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempPath, `${JSON.stringify(indexContent, null, 2)}\n`, "utf-8");
  await fs.rename(tempPath, indexPath);
}

export interface Backup {
  filepath: string;
  backupPath: string;
  timestamp: string;
}

export async function backupFile(cwd: string, filepath: string): Promise<void> {
  const sourcePath = resolvePath(cwd, filepath);
  const exists = await fileExists(sourcePath);
  if (!exists) return;

  const backupDir = resolvePath(cwd, BACKUP_DIR);
  await fs.mkdir(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeName = normalize(filepath).replace(/[/\\]/g, "__");
  const backupName = `${safeName}.${timestamp}`;
  const backupPath = join(backupDir, backupName);

  await fs.cp(sourcePath, backupPath);

  const indexPath = resolvePath(cwd, BACKUP_DIR, ".index.json");
  let indexContent: Record<string, Backup[]>;
  if (await fileExists(indexPath)) {
    try {
      indexContent = JSON.parse(await fs.readFile(indexPath, "utf-8"));
    } catch {
      indexContent = {};
    }
  } else {
    indexContent = {};
  }
  const backups = indexContent[filepath] ?? [];
  backups.push({ filepath, backupPath, timestamp });
  indexContent[filepath] = backups;
  await writeIndexAtomically(indexPath, indexContent);
}

export async function listBackups(cwd: string, filepath: string): Promise<Backup[]> {
  const indexPath = resolvePath(cwd, BACKUP_DIR, ".index.json");
  const exists = await fileExists(indexPath);
  if (!exists) return [];

  const index = JSON.parse(await fs.readFile(indexPath, "utf-8")) as Record<string, Backup[]>;
  if (!index?.[filepath]) return [];

  return index[filepath].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export async function restoreBackup(cwd: string, backup: Backup): Promise<void> {
  const sourcePath = resolvePath(cwd, backup.filepath);
  await fs.cp(backup.backupPath, sourcePath);
}
