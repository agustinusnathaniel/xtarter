import fs from 'node:fs/promises';
import {
  assertPathWithin,
  createSpinner,
  listBackups,
  logError,
  logInfo,
  logSuccess,
  readRunManifest,
  restoreBackup,
} from '@xtarterize/core';
import { defineCommand } from 'citty';

import { openSession } from '@/session.js';
import { getPrompter, type Prompter } from '@/ui/prompter.js';
import { commonArgs, formatArgs } from '@/utils/args.js';

export const undoCommand = defineCommand({
  args: {
    ...commonArgs,
    ...formatArgs,
  },
  meta: {
    description: 'Undo the last xtarterize run by restoring backed-up files',
    name: 'undo',
  },
  async run({ args }) {
    const session = await openSession(args, { resolveTasks: false });
    if (!session) {
      return;
    }
    const { runtime } = session;
    const cwd = runtime.cwd;
    const jsonMode = runtime.format === 'json';
    const quiet = jsonMode || runtime.quiet;
    const manifest = await loadAndValidateManifest(cwd, jsonMode, quiet);
    if (!manifest) {
      return;
    }
    displayManifestPreview(manifest, jsonMode);
    const proceed = await promptRestoreConfirm(manifest, quiet, getPrompter());
    if (!proceed) {
      session.reportOutcome(session.cancelled());
      return;
    }
    const { restored, removedCount, errors } = await restoreManifestFiles(
      cwd,
      manifest,
      quiet
    );
    reportUndoResult({ errors, jsonMode, manifest, removedCount, restored });
  },
});

async function loadAndValidateManifest(
  cwd: string,
  jsonMode: boolean,
  quiet: boolean
) {
  const s = createSpinner(quiet);
  s.start('Reading last run manifest...');
  const manifest = await readRunManifest(cwd);
  s.stop('Manifest loaded');
  if (manifest && manifest.files.length > 0) {
    return manifest;
  }
  if (jsonMode) {
    console.log(JSON.stringify({ error: 'No previous run found', ok: false }));
  } else {
    logError('No previous run found. Nothing to undo.');
    logInfo('Run `xtarterize init` or `xtarterize add` first.');
  }
  process.exitCode = 1;
  return null;
}

function displayManifestPreview(
  manifest: { timestamp: string; files: Array<string> },
  jsonMode: boolean
) {
  if (jsonMode) {
    return;
  }
  console.log('');
  console.log(`Last run: ${manifest.timestamp}`);
  console.log(`Files modified: ${manifest.files.length}`);
  console.log('');
  for (const filepath of manifest.files) {
    console.log(`  ${filepath}`);
  }
  console.log('');
}

async function promptRestoreConfirm(
  manifest: { files: Array<string> },
  quiet: boolean,
  prompter: Prompter
): Promise<boolean | null> {
  if (quiet) {
    return true;
  }
  return prompter.confirm({
    message: `Restore ${manifest.files.length} file(s) to their previous state?`,
  });
}

async function restoreManifestFiles(
  cwd: string,
  manifest: { files: Array<string> },
  quiet: boolean
): Promise<{ restored: number; removedCount: number; errors: Array<string> }> {
  const s = createSpinner(quiet);
  s.start('Restoring files...');
  let restored = 0;
  let removedCount = 0;
  const errors: Array<string> = [];
  for (const filepath of manifest.files) {
    try {
      const backups = await listBackups(cwd, filepath);
      if (backups.length === 0) {
        await removeCreatedFile(cwd, filepath);
        restored++;
        removedCount++;
        continue;
      }
      await restoreBackup(cwd, backups[0]);
      restored++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${filepath}: ${message}`);
    }
  }
  s.stop('Files restored');
  return { errors, removedCount, restored };
}

function reportUndoResult(options: {
  manifest: { timestamp: string; files: Array<string> };
  restored: number;
  removedCount: number;
  errors: Array<string>;
  jsonMode: boolean;
}) {
  const { manifest, restored, removedCount, errors, jsonMode } = options;
  if (jsonMode) {
    const result: Record<string, unknown> = {
      errors,
      files: manifest.files,
      ok: errors.length === 0,
      restored,
      timestamp: manifest.timestamp,
      total: manifest.files.length,
    };
    if (removedCount > 0) {
      result.removed = removedCount;
    }
    console.log(JSON.stringify(result));
    if (errors.length > 0) {
      process.exitCode = 1;
    }
    return;
  }
  console.log('');
  if (errors.length > 0) {
    logError(`${errors.length} error(s):`);
    for (const error of errors) {
      logError(`  - ${error}`);
    }
    process.exitCode = 1;
  }
  logSuccess(`Restored ${restored}/${manifest.files.length} files`);
}

/**
 * Delete a file that the run created. `assertPathWithin` rejects paths that
 * escape the target directory, mirroring the guard in `restoreBackup`.
 */
async function removeCreatedFile(cwd: string, filepath: string): Promise<void> {
  await fs.rm(assertPathWithin(cwd, filepath), { force: true });
}
