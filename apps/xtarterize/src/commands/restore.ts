import { select } from '@clack/prompts';
import type { Backup } from '@xtarterize/core';
import {
  abortIfCancelled,
  createSpinner,
  listBackups,
  logError,
  logSuccess,
  restoreBackup,
} from '@xtarterize/core';
import { defineCommand } from 'citty';

import { resolveCwdWithPreflight } from '@/utils/preflight.js';
import { resolveRuntimeFlags } from '@/utils/runtime-flags.js';

function validateRestoreArgs(filepath: unknown, jsonMode: boolean): boolean {
  if (filepath) {
    return true;
  }
  if (jsonMode) {
    console.log(JSON.stringify({ error: 'File path required', ok: false }));
  } else {
    logError('File path required. Usage: xtarterize restore <filepath>');
  }
  process.exitCode = 1;
  return false;
}

async function loadAndValidateBackups(options: {
  cwd: string;
  filepath: string;
  jsonMode: boolean;
  quiet: boolean;
}): Promise<Array<Backup> | null> {
  const { cwd, filepath, jsonMode, quiet } = options;
  const s = createSpinner(quiet);
  s.start('Loading backups...');
  const backups = await listBackups(cwd, filepath);
  s.stop('Backups loaded');
  if (backups.length > 0) {
    return backups;
  }
  if (jsonMode) {
    console.log(
      JSON.stringify({ error: 'No backups found', filepath, ok: false })
    );
  } else {
    logError(`No backups found for ${filepath}`);
  }
  process.exitCode = 1;
  return null;
}

async function promptRestoreConfirm(
  backups: Array<Backup>,
  yes: boolean
): Promise<Backup> {
  if (backups.length === 1 || yes) {
    return backups[0];
  }
  const result = await select({
    message: 'Select backup to restore:',
    options: backups.map((b) => ({
      label: `${b.timestamp} - ${b.backupPath}`,
      value: b,
    })),
  });
  abortIfCancelled(result);
  return result;
}

async function executeRestore(options: {
  cwd: string;
  selected: Backup;
  filepath: string;
  jsonMode: boolean;
}) {
  const { cwd, selected, filepath, jsonMode } = options;
  try {
    await restoreBackup(cwd, selected);
    if (jsonMode) {
      console.log(
        JSON.stringify({
          filepath,
          ok: true,
          restoredFrom: selected.backupPath,
          timestamp: selected.timestamp,
        })
      );
      return;
    }
    logSuccess(`Restored ${filepath} from backup`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (jsonMode) {
      console.log(JSON.stringify({ error: message, filepath, ok: false }));
      process.exitCode = 1;
      return;
    }
    logError(`Failed to restore: ${message}`);
    process.exitCode = 1;
  }
}

export const restoreCommand = defineCommand({
  args: {
    cwd: {
      description: 'Target directory (default: current working directory)',
      type: 'string',
    },
    filepath: {
      description: 'File to restore (e.g., tsconfig.json)',
      type: 'positional',
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
      description: 'Suppress verbose output',
      type: 'boolean',
    },
    yes: {
      description: 'Skip confirmation, restore latest backup',
      type: 'boolean',
    },
  },
  meta: {
    description: 'Restore a file from backup',
    name: 'restore',
  },
  async run({ args }) {
    const cwd = await resolveCwdWithPreflight(args);
    const filepath = args.filepath as string | undefined;
    const { format, quiet: runtimeQuiet } = resolveRuntimeFlags(args);
    const jsonMode = format === 'json';
    const quiet = jsonMode || runtimeQuiet;
    const yes = args.yes === true || jsonMode;
    if (!validateRestoreArgs(filepath, jsonMode)) {
      return;
    }
    const backups = await loadAndValidateBackups({
      cwd,
      filepath: filepath as string,
      jsonMode,
      quiet,
    });
    if (!backups) {
      return;
    }
    const selected = await promptRestoreConfirm(backups, yes);
    await executeRestore({
      cwd,
      filepath: filepath as string,
      jsonMode,
      selected,
    });
  },
});
