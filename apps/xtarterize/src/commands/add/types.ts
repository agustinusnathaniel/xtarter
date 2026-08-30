import type { ProjectProfile, Task, TaskStatus } from '@xtarterize/core';

import type { DisplayFormat } from '@/ui/diff-display.js';

export interface TaskWithStatus {
  status: TaskStatus;
  task: Task;
}

export interface RunSingleTaskOptions {
  allTasks: Array<Task>;
  cwd: string;
  detectionMs: number;
  format: DisplayFormat;
  includeConflicts: boolean;
  profile: ProjectProfile;
  quiet: boolean;
  recordTiming: boolean;
  taskId: string;
}

export interface RunInteractiveOptions {
  all?: boolean;
  allTasks: Array<Task>;
  cwd: string;
  detectionMs: number;
  format: DisplayFormat;
  includeConflicts: boolean;
  profile: ProjectProfile;
  quiet: boolean;
  recordTiming: boolean;
}
