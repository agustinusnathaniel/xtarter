import fs from 'node:fs/promises';

/**
 * Existence probe kept in its own module: `utils/fs.ts` imports the
 * Effect-tagged `FileSystemError`, so re-exporting `fileExists` from there
 * would drag `effect` into the Effect-free `@xtarterize/core/plain` entry.
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
