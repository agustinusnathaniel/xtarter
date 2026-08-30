export interface TaskTiming {
  applyMs?: number;
  checkMs?: number;
  dryRunMs?: number;
  id: string;
  label: string;
}

export interface ResolveTiming {
  detectionMs: number;
  resolutionMs: number;
  resolutionSumMs: number;
}

export interface ApplyTiming {
  applyMs: number;
  tasks: Array<TaskTiming>;
}
