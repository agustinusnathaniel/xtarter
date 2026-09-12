import type {
  DiagnosticCheck,
  InquiryResult,
  ProjectProfile,
  ResolveTiming,
  Task,
  TaskStatus,
} from '@xtarterize/core';

import type { SessionOutcome } from '@/session.js';
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

export function countCheckSummary(
  tasks: Array<Task>,
  statuses: Map<string, TaskStatus>
): { conformant: number; total: number } {
  return {
    conformant: tasks.filter((t) => statuses.get(t.id) === 'skip').length,
    total: tasks.length,
  };
}

export function computeCheckOk(
  summary: { conformant: number; total: number },
  diagnostics: Array<DiagnosticCheck>
): boolean {
  const hasFailures = diagnostics.some((d) => d.status === 'fail');
  return !hasFailures && summary.conformant === summary.total;
}

export function formatCheckResult(options: CheckResultOptions): string {
  const { tasks, statuses, diagnostics, timing } = options;
  const summary = countCheckSummary(tasks, statuses);
  return JSON.stringify({
    diagnostics,
    ok: computeCheckOk(summary, diagnostics),
    summary,
    tasks: formatTaskList(tasks, statuses),
    ...(timing ? { timing } : {}),
  });
}

interface ListResultOptions {
  profile: ProjectProfile;
  statuses: Map<string, TaskStatus>;
  tasks: Array<Task>;
  timing?: ResolveTiming;
}

export function formatListResult(options: ListResultOptions): string {
  const { profile, tasks, statuses, timing } = options;
  return JSON.stringify({
    ok: true,
    profile: {
      bundler: profile.bundler,
      framework: profile.framework,
      packageManager: profile.packageManager,
      typescript: profile.typescript,
    },
    tasks: formatTaskList(tasks, statuses),
    ...(timing ? { timing } : {}),
  });
}

interface QueryResultOptions {
  query: string;
  results: Array<InquiryResult>;
  statuses?: Map<string, TaskStatus>;
}

export function formatQueryResult(options: QueryResultOptions): string {
  const { results, query, statuses } = options;
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
  return JSON.stringify(data, null, 2);
}

export function formatDoctorResult(
  diagnostics: Array<DiagnosticCheck>,
  summary: { pass: number; warn: number; fail: number; total: number }
): string {
  return JSON.stringify({ diagnostics, ok: summary.fail === 0, summary });
}

export function formatRunResult(outcome: SessionOutcome): string {
  const result: Record<string, unknown> = {
    applied: outcome.applied,
    errors: outcome.errors,
    ok: outcome.ok,
    skipped: outcome.skipped,
  };
  if (outcome.taskId !== undefined) {
    result.taskId = outcome.taskId;
  }
  if (outcome.taskStatus !== undefined) {
    result.status = outcome.taskStatus;
  }
  if (outcome.recordTiming) {
    result.timing = formatTimingJson(outcome.timing, outcome.applyTiming);
  }
  return JSON.stringify(result);
}
