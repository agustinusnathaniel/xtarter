import type { Task, TaskStatus } from '@xtarterize/core';

import type { CommandSession } from '@/session.js';
import type { Prompter } from '@/ui/prompter.js';

export interface TaskWithStatus {
  status: TaskStatus;
  task: Task;
}

export interface RunSingleTaskOptions {
  includeConflicts: boolean;
  prompter: Prompter;
  recordTiming: boolean;
  session: CommandSession;
  taskId: string;
}

export interface RunInteractiveOptions {
  all?: boolean;
  includeConflicts: boolean;
  prompter: Prompter;
  recordTiming: boolean;
  session: CommandSession;
}
