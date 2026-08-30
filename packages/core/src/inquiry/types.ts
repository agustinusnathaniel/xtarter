import type { Task } from '@/_base.js';

export interface RelevanceSignal {
  name: string;
  score: number;
}

export interface InquiryResult {
  relevance: number;
  signals: Array<RelevanceSignal>;
  task: Task;
  taskId: string;
}

export interface WeightConfig {
  config: number;
  group: number;
  id: number;
  keywords: number;
  label: number;
}

export interface InquiryOptions {
  maxResults?: number;
  minScore?: number;
  weights?: Partial<WeightConfig>;
}
