import type {
  BackupError,
  DepsInstaller,
  ProcessRunner,
  Task,
  TaskError,
  TaskStatus,
} from '@xtarterize/core';

import type { CommandSession } from '@/session.js';
import type { PromptError, Prompter } from '@/ui/prompter.js';

/** Error channel of the `add` program and its interactive flows. */
export type AddCommandError = TaskError | BackupError | PromptError;

/** Services the `add` program and its interactive flows may require. */
export type AddCommandServices = DepsInstaller | ProcessRunner | Prompter;

export interface TaskWithStatus {
  status: TaskStatus;
  task: Task;
}

export interface RunInteractiveOptions {
  all?: boolean;
  includeConflicts: boolean;
  recordTiming: boolean;
  session: CommandSession;
}

export type RunSingleTaskOptions = Omit<RunInteractiveOptions, 'all'> & {
  taskId: string;
};
