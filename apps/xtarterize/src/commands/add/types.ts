import type { Task, TaskStatus } from '@xtarterize/core';

import type { CommandSession } from '@/session.js';

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
