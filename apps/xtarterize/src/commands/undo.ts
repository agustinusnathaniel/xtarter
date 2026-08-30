import fs from 'node:fs/promises';
import { confirm } from '@clack/prompts';
import {
  abortIfCancelled,
  createSpinner,
  listBackups,
  logError,
  logInfo,
  logSuccess,
  readRunManifest,
  resolvePath,
  restoreBackup,
} from '@xtarterize/core';
import { defineCommand } from 'citty';

import { resolveCwdWithPreflight } from '@/utils/preflight.js';
import { resolveRuntimeFlags } from '@/utils/runtime-flags.js';

export const undoCommand = defineCommand({
  args: {
    cwd: {
      description: 'Target directory (default: current working directory)',
      type: 'string',
    },
    format: {
      description: 'Output format (terminal|json)',
      type: 'string',
    },
    json: {
      description: 'Output machine-readable JSON',
      type: 'boolean',
    },
    quiet: {
      description: 'Suppress interactive prompts (auto-confirm)',
      type: 'boolean',
    },
  },
  meta: {
    description: 'Undo the last xtarterize run by restoring backed-up files',
    name: 'undo',
  },
  async run({ args }) {
    const cwd = await resolveCwdWithPreflight(args);
    const { format, quiet: runtimeQuiet } = resolveRuntimeFlags(args);
    const jsonMode = format === 'json';
    const quiet = jsonMode || runtimeQuiet;
    const manifest = await loadAndValidateManifest(cwd, jsonMode, quiet);
    if (!manifest) {
      return;
    }
    displayManifestPreview(manifest, jsonMode);
    if (!(await promptRestoreConfirm(manifest, quiet))) {
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
  quiet: boolean
): Promise<boolean> {
  if (quiet) {
    return true;
  }
  const proceed = await confirm({
    message: `Restore ${manifest.files.length} file(s) to their previous state?`,
  });
  abortIfCancelled(proceed, 'Undo cancelled');
  return Boolean(proceed);
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
 * Delete a file that the run created. Mirrors the path-traversal guard used
 * by restoreBackup: the resolved path must stay inside the target directory.
 */
async function removeCreatedFile(cwd: string, filepath: string): Promise<void> {
  const resolvedDest = resolvePath(cwd, filepath);
  const resolvedCwd = resolvePath(cwd);
  if (
    !resolvedDest.startsWith(`${resolvedCwd}/`) &&
    resolvedDest !== resolvedCwd
  ) {
    throw new Error(`Path traversal detected: ${filepath}`);
  }
  await fs.rm(resolvedDest, { force: true });
}
