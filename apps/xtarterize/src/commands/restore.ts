import type {
  Backup,
  DepsInstaller,
  ProcessRunner,
  TaskError,
} from '@xtarterize/core';
import {
  createSpinner,
  listBackups,
  logError,
  logSuccess,
  restoreBackup,
} from '@xtarterize/core';
import { defineCommand } from 'citty';
import { Effect } from 'effect';

import { runCliProgram } from '@/runtime.js';
import { openSession } from '@/session.js';
import { type PromptError, Prompter } from '@/ui/prompter.js';
import { reportCommandFailure } from '@/ui/reporter.js';
import { commonArgs, formatArgs, yesArg } from '@/utils/args.js';
import type { RuntimeArgs } from '@/utils/runtime.js';

export interface RestoreCommandArgs extends RuntimeArgs {
  filepath?: string;
  yes?: boolean;
}

type RestoreError = TaskError | PromptError;

type RestoreServices = DepsInstaller | ProcessRunner | Prompter;

function validateRestoreArgs(filepath: unknown, jsonMode: boolean): boolean {
  if (filepath) {
    return true;
  }
  reportCommandFailure(jsonMode, { error: 'File path required' }, () =>
    logError('File path required. Usage: xtarterize restore <filepath>')
  );
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
  reportCommandFailure(jsonMode, { error: 'No backups found', filepath }, () =>
    logError(`No backups found for ${filepath}`)
  );
  return null;
}

function promptRestoreConfirm(
  backups: Array<Backup>,
  yes: boolean
): Effect.Effect<Backup | null, PromptError, Prompter> {
  if (backups.length === 1 || yes) {
    return Effect.succeed(backups[0]);
  }
  return Effect.flatMap(Prompter, (prompter) =>
    prompter.select<Backup>({
      message: 'Select backup to restore:',
      options: backups.map((b) => ({
        label: `${b.timestamp} - ${b.backupPath}`,
        value: b,
      })),
    })
  );
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
    reportCommandFailure(jsonMode, { error: message, filepath }, () =>
      logError(`Failed to restore: ${message}`)
    );
  }
}

/** The `restore` command as one program: open once, prompt, restore. */
export function restoreProgram(
  args: RestoreCommandArgs
): Effect.Effect<void, RestoreError, RestoreServices> {
  return Effect.gen(function* () {
    const session = yield* openSession(args, { resolveTasks: false });
    if (!session) {
      return;
    }
    const { runtime } = session;
    const cwd = runtime.cwd;
    const filepath = args.filepath;
    const jsonMode = runtime.format === 'json';
    const quiet = jsonMode || runtime.quiet;
    const yes = args.yes === true || jsonMode;
    if (!validateRestoreArgs(filepath, jsonMode)) {
      return;
    }
    const backups = yield* Effect.promise(() =>
      loadAndValidateBackups({
        cwd,
        filepath: filepath as string,
        jsonMode,
        quiet,
      })
    );
    if (!backups) {
      return;
    }
    const selected = yield* promptRestoreConfirm(backups, yes);
    if (selected === null) {
      session.reportOutcome(session.cancelled());
      return;
    }
    yield* Effect.promise(() =>
      executeRestore({
        cwd,
        filepath: filepath as string,
        jsonMode,
        selected,
      })
    );
  });
}

export const restoreCommand = defineCommand({
  args: {
    ...commonArgs,
    ...formatArgs,
    filepath: {
      description: 'File to restore (e.g., tsconfig.json)',
      type: 'positional',
    },
    yes: yesArg,
  },
  meta: {
    description: 'Restore a file from backup',
    name: 'restore',
  },
  async run({ args }) {
    await runCliProgram(restoreProgram(args));
  },
});
