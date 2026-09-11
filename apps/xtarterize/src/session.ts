import type {
  ApplyPlan,
  ApplyResult,
  ApplyTiming,
  FileDiff,
  PreflightError,
  ProjectProfile,
  ResolveTiming,
  Task,
  TaskSelectionConfig,
  TaskStatus,
} from '@xtarterize/core';
import {
  ensureXtarterizeGitignore,
  executePlan,
  loadSelectionConfig,
  planTasks,
  resolveProjectTasks,
  runPreflight,
} from '@xtarterize/core';

import { mergeFileDiffs } from '@/ui/merge-file-diffs.js';
import { getPrompter } from '@/ui/prompter.js';
import { reportPreflightFailure, reportSessionOutcome } from '@/ui/reporter.js';
import {
  detectProjectWithAmbiguity,
  getAllTasksWithPlugins,
} from '@/utils/project.js';
import {
  type RuntimeArgs,
  type RuntimeContext,
  resolveRuntimeContext,
} from '@/utils/runtime.js';

export type SessionOutcomeKind =
  | 'apply'
  | 'blocked'
  | 'cancelled'
  | 'dry-run'
  | 'empty';

/** Status values a single-task outcome can expose in the JSON payload. */
export type SessionTaskOutcome = TaskStatus | 'not-applicable';

export interface SessionOutcome {
  applied: number;
  applyTiming?: ApplyTiming;
  diffs: Array<FileDiff>;
  dryRunFailures?: number;
  errors: Array<string>;
  hint?: string;
  kind: SessionOutcomeKind;
  message?: string;
  ok: boolean;
  recordTiming?: boolean;
  skipped: number;
  statuses: Map<string, TaskStatus>;
  taskId?: string;
  taskStatus?: SessionTaskOutcome;
  timing: ResolveTiming;
}

export interface SessionIdleDetails {
  errors?: Array<string>;
  hint?: string;
  taskId?: string;
  taskStatus?: SessionTaskOutcome;
}

export interface SessionOpenFailure {
  errors: Array<PreflightError>;
  ok: false;
  runtime: RuntimeContext;
}

export type SessionOpenResult =
  | { ok: true; session: CommandSession }
  | SessionOpenFailure;

export interface SessionOpenOptions {
  /** Keep the session usable when preflight fails (`doctor` opts out). */
  allowInvalidProject?: boolean;
  /** Transform the discovered tasks before status resolution (compose order). */
  orderTasks?: (tasks: Array<Task>, runtime: RuntimeContext) => Array<Task>;
  /** Skip task discovery and resolution for runtime-only commands. */
  resolveTasks?: boolean;
}

export interface SessionPlanOptions {
  includeConflicts?: boolean;
  tasks: Array<Task>;
}

export interface SessionApplyOptions {
  includeCheckErrors?: boolean;
  includeConflicts?: boolean;
  recordTiming?: boolean;
  taskId?: string;
  taskStatus?: SessionTaskOutcome;
}

export interface SessionOutcomeOptions extends SessionApplyOptions {
  /** Override the reported skipped count (interactive add counts declines). */
  skipped?: number;
}

interface SessionContext {
  allTasks: Array<Task>;
  checkErrors: Map<string, string>;
  /** Null only for runtime-only sessions (`resolveTasks: false`). */
  profile: ProjectProfile | null;
  runtime: RuntimeContext;
  selection: TaskSelectionConfig;
  statuses: Map<string, TaskStatus>;
  tasks: Array<Task>;
  timing: ResolveTiming;
}

const EMPTY_TIMING: ResolveTiming = {
  detectionMs: 0,
  resolutionMs: 0,
  resolutionSumMs: 0,
};

function formatCheckError(taskId: string, detail: string): string {
  return `Failed to check ${taskId}: ${detail}`;
}

function buildDryRunOutcome(
  plan: ApplyPlan,
  context: SessionContext
): SessionOutcome {
  const failures = plan.entries.filter(
    (entry) => entry.dryRunError !== undefined
  ).length;
  const diffs = mergeFileDiffs(plan.entries.flatMap((entry) => entry.diffs));
  const errors = plan.entries.flatMap((entry) =>
    entry.dryRunError === undefined ? [] : [entry.dryRunError]
  );
  return {
    applied: 0,
    diffs,
    dryRunFailures: failures,
    errors,
    kind: 'dry-run',
    ok: diffs.length === 0 && failures === 0,
    skipped: 0,
    statuses: context.statuses,
    timing: context.timing,
  };
}

/**
 * Owns one command lifecycle: open the project, plan a task set, execute the
 * plan, and report the outcome. The session never writes to the console;
 * `reportOutcome` delegates to the terminal/JSON reporter and fails the
 * process when the outcome reports errors.
 */
export class CommandSession {
  private readonly context: SessionContext;

  private constructor(context: SessionContext) {
    this.context = context;
  }

  static async open(
    args: RuntimeArgs,
    options: SessionOpenOptions = {}
  ): Promise<SessionOpenResult> {
    const runtime = resolveRuntimeContext(args);
    await ensureXtarterizeGitignore(runtime.cwd);
    const preflight = await runPreflight(runtime.cwd);
    if (!(preflight.valid || options.allowInvalidProject)) {
      return { errors: preflight.errors, ok: false, runtime };
    }

    if (options.resolveTasks === false) {
      return {
        ok: true,
        session: new CommandSession({
          allTasks: [],
          checkErrors: new Map(),
          profile: null,
          runtime,
          selection: { only: [], skip: [] },
          statuses: new Map(),
          tasks: [],
          timing: EMPTY_TIMING,
        }),
      };
    }

    const discovered = await getAllTasksWithPlugins(runtime.cwd);
    const tasks = options.orderTasks
      ? options.orderTasks(discovered, runtime)
      : discovered;
    const {
      checkErrors,
      profile: baseProfile,
      tasks: resolvedTasks,
      statuses,
      timing,
    } = await resolveProjectTasks(runtime.cwd, tasks);
    const profile = await detectProjectWithAmbiguity({
      baseProfile,
      cwd: runtime.cwd,
      prompter: getPrompter(),
      quiet: runtime.quiet,
    });
    const selection = await loadSelectionConfig(runtime.cwd);

    return {
      ok: true,
      session: new CommandSession({
        allTasks: tasks,
        checkErrors,
        profile,
        runtime,
        selection,
        statuses,
        tasks: resolvedTasks,
        timing,
      }),
    };
  }

  get allTasks(): Array<Task> {
    return this.context.allTasks;
  }

  /** Per-task check failures collected during status resolution. */
  get checkErrors(): Map<string, string> {
    return this.context.checkErrors;
  }

  /** Per-task check failures formatted like `ApplyResult.errors` entries. */
  get checkErrorMessages(): Array<string> {
    return [...this.context.checkErrors].map(([taskId, detail]) =>
      formatCheckError(taskId, detail)
    );
  }

  get profile(): ProjectProfile {
    if (!this.context.profile) {
      throw new Error('Session was opened without task resolution');
    }
    return this.context.profile;
  }

  get runtime(): RuntimeContext {
    return this.context.runtime;
  }

  get selection(): TaskSelectionConfig {
    return this.context.selection;
  }

  get statuses(): Map<string, TaskStatus> {
    return this.context.statuses;
  }

  get tasks(): Array<Task> {
    return this.context.tasks;
  }

  get timing(): ResolveTiming {
    return this.context.timing;
  }

  plan(options: SessionPlanOptions): Promise<ApplyPlan> {
    return planTasks({
      cwd: this.context.runtime.cwd,
      includeConflicts: options.includeConflicts ?? false,
      profile: this.profile,
      quiet: this.context.runtime.quiet,
      statuses: this.context.statuses,
      tasks: options.tasks,
    });
  }

  execute(plan: ApplyPlan): Promise<ApplyResult> {
    return executePlan({
      cwd: this.context.runtime.cwd,
      plan,
      profile: this.profile,
      quiet: this.context.runtime.quiet,
    });
  }

  /** Shape an executed plan result into a reportable outcome. */
  outcomeFor(
    result: ApplyResult,
    options: SessionOutcomeOptions = {}
  ): SessionOutcome {
    const checkErrors = options.includeCheckErrors
      ? this.checkErrorMessages
      : [];
    const errors = [...checkErrors, ...result.errors];
    return {
      applied: result.applied,
      applyTiming: result.timing,
      diffs: [],
      errors,
      kind: 'apply',
      ok: errors.length === 0,
      recordTiming: options.recordTiming === true,
      skipped: options.skipped ?? result.skipped,
      statuses: this.context.statuses,
      taskId: options.taskId,
      taskStatus: options.taskStatus,
      timing: this.context.timing,
    };
  }

  async dryRun(tasks: Array<Task>): Promise<SessionOutcome> {
    const plan = await this.plan({ includeConflicts: true, tasks });
    return buildDryRunOutcome(plan, this.context);
  }

  async apply(
    tasks: Array<Task>,
    options: SessionApplyOptions = {}
  ): Promise<SessionOutcome> {
    const plan = await this.plan({
      includeConflicts: options.includeConflicts,
      tasks,
    });
    const result = await this.execute(plan);
    return this.outcomeFor(result, options);
  }

  /** Informational outcome with no writes (skip, not-applicable, no-op). */
  empty(message: string, details: SessionIdleDetails = {}): SessionOutcome {
    return this.buildIdleOutcome('empty', message, details);
  }

  /** Failure outcome with no writes (conflict, missing task, check error). */
  blocked(message: string, details: SessionIdleDetails = {}): SessionOutcome {
    return this.buildIdleOutcome('blocked', message, details);
  }

  cancelled(): SessionOutcome {
    return this.buildIdleOutcome('cancelled', 'Cancelled');
  }

  private report(outcome: SessionOutcome): void {
    reportSessionOutcome(outcome, this.context.runtime);
  }

  /** Report an outcome and fail the process when it reports errors. */
  reportOutcome(outcome: SessionOutcome): void {
    this.report(outcome);
    if (!outcome.ok) {
      process.exitCode = 1;
    }
  }

  private buildIdleOutcome(
    kind: 'blocked' | 'cancelled' | 'empty',
    message: string,
    details: SessionIdleDetails = {}
  ): SessionOutcome {
    const errors = details.errors ?? (kind === 'blocked' ? [message] : []);
    return {
      applied: 0,
      diffs: [],
      errors,
      hint: details.hint,
      kind,
      message,
      ok: kind !== 'blocked',
      skipped: 0,
      statuses: this.context.statuses,
      taskId: details.taskId,
      taskStatus: details.taskStatus,
      timing: this.context.timing,
    };
  }
}

/**
 * Open a session for a command, rendering a structured preflight failure as
 * terminal or JSON text and marking the process as failed when it is invalid.
 */
export async function openSession(
  args: RuntimeArgs,
  options: SessionOpenOptions = {}
): Promise<CommandSession | null> {
  const opened = await CommandSession.open(args, options);
  if (opened.ok) {
    return opened.session;
  }

  reportPreflightFailure(opened.errors, opened.runtime.format);
  process.exitCode = 1;
  return null;
}
