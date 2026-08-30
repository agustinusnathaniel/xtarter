import type {
  DiagnosticCheck,
  InquiryResult,
  ProjectProfile,
  ResolveTiming,
  Task,
  TaskStatus,
} from '@xtarterize/core';

import { formatTimingJson } from '@/utils/timing-display.js';

export interface TaskJson {
  group: string;
  id: string;
  label: string;
  status: TaskStatus;
}

export function formatTaskList(
  tasks: Array<Task>,
  statuses: Map<string, TaskStatus>
): Array<TaskJson> {
  return tasks.map((task) => ({
    group: task.group,
    id: task.id,
    label: task.label,
    status: statuses.get(task.id) ?? 'new',
  }));
}

interface CheckResultOptions {
  diagnostics: Array<DiagnosticCheck>;
  statuses: Map<string, TaskStatus>;
  tasks: Array<Task>;
  timing?: ResolveTiming;
}

export function computeCheckOk(
  tasks: Array<Task>,
  statuses: Map<string, TaskStatus>,
  diagnostics: Array<DiagnosticCheck>
): boolean {
  const conformant = tasks.filter((t) => statuses.get(t.id) === 'skip').length;
  const hasFailures = diagnostics.some((d) => d.status === 'fail');
  return !hasFailures && conformant === tasks.length;
}

export function formatCheckResult(options: CheckResultOptions): string {
  const { tasks, statuses, diagnostics, timing } = options;
  const conformant = tasks.filter((t) => statuses.get(t.id) === 'skip').length;
  const result: Record<string, unknown> = {
    diagnostics,
    ok: computeCheckOk(tasks, statuses, diagnostics),
    summary: { conformant, total: tasks.length },
    tasks: formatTaskList(tasks, statuses),
  };
  if (timing) {
    result.timing = timing;
  }
  return JSON.stringify(result);
}

interface ListResultOptions {
  profile: ProjectProfile;
  statuses: Map<string, TaskStatus>;
  tasks: Array<Task>;
  timing?: ResolveTiming;
}

export function formatListResult(options: ListResultOptions): string {
  const { profile, tasks, statuses, timing } = options;
  const result: Record<string, unknown> = {
    ok: true,
    profile: {
      bundler: profile.bundler,
      framework: profile.framework,
      packageManager: profile.packageManager,
      typescript: profile.typescript,
    },
    tasks: formatTaskList(tasks, statuses),
  };
  if (timing) {
    result.timing = timing;
  }
  return JSON.stringify(result);
}

interface QueryResultOptions {
  query: string;
  results: Array<InquiryResult>;
  statuses?: Map<string, TaskStatus>;
  timing?: ResolveTiming;
}

export function formatQueryResult(options: QueryResultOptions): string {
  const { results, query, statuses, timing } = options;
  const data: Record<string, unknown> = {
    count: results.length,
    query,
    results: results.map((r) => ({
      group: r.task.group,
      label: r.task.label,
      relevance: r.relevance,
      signals: r.signals,
      status: statuses?.get(r.taskId) ?? 'new',
      taskId: r.taskId,
    })),
    type: 'query',
  };
  if (timing) {
    data.timing = formatTimingJson(timing);
  }
  return JSON.stringify(data, null, 2);
}

export function formatDoctorResult(
  diagnostics: Array<DiagnosticCheck>
): string {
  const summary = {
    fail: diagnostics.filter((d) => d.status === 'fail').length,
    pass: diagnostics.filter((d) => d.status === 'pass').length,
    total: diagnostics.length,
    warn: diagnostics.filter((d) => d.status === 'warn').length,
  };
  return JSON.stringify({ diagnostics, ok: summary.fail === 0, summary });
}

export interface RunResult {
  applied: number;
  errors: Array<string>;
  ok: boolean;
  skipped: number;
  status?: string;
  taskId?: string;
  timing?: Record<string, unknown>;
}

export function formatRunResult(options: RunResult): string {
  const result: Record<string, unknown> = {
    applied: options.applied,
    errors: options.errors,
    ok: options.ok,
    skipped: options.skipped,
  };
  if (options.taskId !== undefined) {
    result.taskId = options.taskId;
  }
  if (options.status !== undefined) {
    result.status = options.status;
  }
  if (options.timing) {
    result.timing = options.timing;
  }
  return JSON.stringify(result);
}
