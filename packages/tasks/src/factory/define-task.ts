import {
  type FileDiff,
  type ProjectProfile,
  type Task,
  type TaskDep,
  TaskError,
  type TaskScope,
  type TaskSearchMeta,
  type TaskServices,
  type TaskStatus,
  toTaskEffect,
} from '@xtarterize/core';
import { Effect } from 'effect';

export type { TaskDep } from '@xtarterize/core';

import { checkMissingDeps, writeTaskDiffs } from './ops.js';
import { applyPackageJsonChange } from './package-json.js';
import {
  deriveConfigTargets,
  type ResolveContext,
  type ResolvedTarget,
  resolveTarget,
  type TargetDraft,
  type TaskTarget,
} from './targets.js';

export type {
  TargetPolicy,
  TargetPolicyInput,
  TaskTarget,
  TransformTarget,
} from './targets.js';

/**
 * A spec surface may stay synchronous, return a Promise, or return an Effect
 * that requires the task services. The factory lifts all three shapes into one
 * Effect so callers see a single contract.
 */
export type SpecResult<A> =
  | A
  | Promise<A>
  | Effect.Effect<A, TaskError, TaskServices>;

/** A `Task` from `defineTask`, which always implements `getDeps`. */
export type DefinedTask = Task & {
  getDeps: NonNullable<Task['getDeps']>;
};

export interface TaskAction {
  check: (cwd: string, profile: ProjectProfile) => SpecResult<TaskStatus>;
  run: (cwd: string, profile: ProjectProfile) => SpecResult<void>;
}

export interface TaskResolution {
  deps: Array<TaskDep>;
  diffs: Array<FileDiff>;
  status: TaskStatus;
  targets: Array<ResolvedTarget>;
}

/** The resolution a dependency resolver receives, before deps are evaluated. */
export type SpecResolution = Omit<TaskResolution, 'deps'>;

/** Context a dependency resolver needs beyond the resolution itself. */
export interface DepResolverContext {
  cwd: string;
  profile: ProjectProfile;
}

export type DepResolver = (
  resolution: SpecResolution,
  context: DepResolverContext
) => SpecResult<Array<TaskDep>>;

export type DepsDeclaration = Array<TaskDep> | DepResolver;

/** Targets may depend on project state and profile, so they resolve lazily. */
export type SpecTargetResolver = (
  cwd: string,
  profile: ProjectProfile
) => SpecResult<Array<TaskTarget>>;

/**
 * Metadata whose `configTargets` is derived from the declared targets when the
 * author leaves it out. Resolver targets are profile-dependent, so they must
 * declare `configTargets` explicitly.
 */
export type SpecSearchMeta = Omit<TaskSearchMeta, 'configTargets'> & {
  configTargets?: Array<string>;
};

export interface TaskSpec {
  actions?: Array<TaskAction>;
  applicable: (profile: ProjectProfile) => boolean;
  /** Search config files; derived from `targets` when omitted. */
  configTargets?: Array<string>;
  deps?: DepsDeclaration;
  group: string;
  id: string;
  /** Extra search keywords, assembled into `searchMeta`. */
  keywords?: Array<string>;
  label: string;
  scope?: TaskScope;
  searchMeta?: SpecSearchMeta;
  /** Descriptive search tags, assembled into `searchMeta`. */
  tags?: Array<string>;
  targets?: Array<TaskTarget> | SpecTargetResolver;
}

/** conflict wins over patch, then new, then skip. */
function combineStatuses(statuses: Array<TaskStatus>): TaskStatus {
  if (statuses.includes('conflict')) {
    return 'conflict';
  }
  if (statuses.includes('patch')) {
    return 'patch';
  }
  if (statuses.includes('new')) {
    return 'new';
  }
  return 'skip';
}

function collectDiffs(targets: Array<ResolvedTarget>): Array<FileDiff> {
  const diffs: Array<FileDiff> = [];
  for (const target of targets) {
    if (target.diff) {
      diffs.push(target.diff);
    }
  }
  return diffs;
}

function resolveDeps(
  declaration: DepsDeclaration | undefined,
  resolution: SpecResolution,
  context: ResolveContext
): SpecResult<Array<TaskDep>> {
  if (declaration === undefined) {
    return [];
  }
  return typeof declaration === 'function'
    ? declaration(resolution, context)
    : declaration;
}

/**
 * Reapply the dependency signal the factories produced before comparing
 * content: an existing target whose declared dependency is not installed
 * projects as `patch`, so the apply plan still installs it when the content
 * already matches. Conflict still wins, and an absent target stays `new`.
 *
 * An explicit `new` status (a policy projecting content the project does not
 * have yet) is also preserved: the packageJson factory reported `new` when
 * every configured script and file was missing and the dependency was not
 * installed, and `patch` once the dependency was present. The per-task policy
 * supplies the dependency-visible half of that decision.
 */
async function applyDependencyStatus(
  drafts: Array<TargetDraft>,
  deps: Array<TaskDep>,
  cwd: string
): Promise<Array<ResolvedTarget>> {
  if (deps.length === 0) {
    return drafts.map((draft) => draft.target);
  }
  const missing = await checkMissingDeps(
    cwd,
    deps.map((dep) => dep.depName)
  );
  if (missing === null) {
    return drafts.map((draft) => draft.target);
  }
  return drafts.map((draft) =>
    draft.exists && draft.target.status !== 'new'
      ? {
          ...draft.target,
          status: combineStatuses([draft.target.status, 'patch']),
        }
      : draft.target
  );
}

function resolveSpec(
  spec: TaskSpec,
  context: ResolveContext
): Effect.Effect<TaskResolution, TaskError, TaskServices> {
  return Effect.gen(function* () {
    const declared = spec.targets;
    const declaredTargets =
      typeof declared === 'function'
        ? yield* toTaskEffect(spec.id, () =>
            declared(context.cwd, context.profile)
          )
        : (declared ?? []);
    const drafts: Array<TargetDraft> = [];
    for (const target of declaredTargets) {
      const draft = yield* toTaskEffect(spec.id, () =>
        resolveTarget(target, context)
      );
      drafts.push(draft);
    }
    const actionStatuses: Array<TaskStatus> = [];
    for (const action of spec.actions ?? []) {
      const status = yield* toTaskEffect(spec.id, () =>
        action.check(context.cwd, context.profile)
      );
      actionStatuses.push(status);
    }
    const provisionalTargets = drafts.map((draft) => draft.target);
    const provisional: SpecResolution = {
      diffs: collectDiffs(provisionalTargets),
      status: combineStatuses([
        ...provisionalTargets.map((target) => target.status),
        ...actionStatuses,
      ]),
      targets: provisionalTargets,
    };
    const deps = yield* toTaskEffect(spec.id, () =>
      resolveDeps(spec.deps, provisional, context)
    );
    const targets = yield* toTaskEffect(spec.id, () =>
      applyDependencyStatus(drafts, deps, context.cwd)
    );
    return {
      deps,
      diffs: collectDiffs(targets),
      status: combineStatuses([
        ...targets.map((target) => target.status),
        ...actionStatuses,
      ]),
      targets,
    };
  });
}

function applySpec(
  spec: TaskSpec,
  context: ResolveContext
): Effect.Effect<void, TaskError, TaskServices> {
  return Effect.gen(function* () {
    const { cwd, profile } = context;
    const { targets } = yield* resolveSpec(spec, context);
    const diffs: Array<FileDiff> = [];
    for (const target of targets) {
      if (target.kind === 'packageJson') {
        yield* toTaskEffect(spec.id, () =>
          applyPackageJsonChange(cwd, target.patch)
        );
        continue;
      }
      if (target.diff) {
        diffs.push(target.diff);
      }
    }
    yield* toTaskEffect(spec.id, () => writeTaskDiffs(cwd, diffs));
    for (const action of spec.actions ?? []) {
      yield* toTaskEffect(spec.id, () => action.run(cwd, profile));
    }
  });
}

/**
 * Label a method failure the way the removed `wrapTask` did:
 * `<method> failed: <String(cause)>`, with the raw cause preserved. Internal
 * lifts carry their raw cause (even `undefined`) as an own `cause` property;
 * an Effect the spec authored passes its own failure through unchanged.
 */
function labelFailure<A>(
  specId: string,
  method: string,
  effect: Effect.Effect<A, TaskError, TaskServices>
): Effect.Effect<A, TaskError, TaskServices> {
  return Effect.mapError(effect, (failure) => {
    const cause = Object.hasOwn(failure, 'cause') ? failure.cause : failure;
    return new TaskError({
      cause,
      message: `${method} failed: ${String(cause)}`,
      taskId: specId,
    });
  });
}

/**
 * Assemble search metadata from the top-level fields or the nested `searchMeta`
 * form. Keywords and tags stay authored; only targets the spec declares
 * statically can be derived. Authored `configTargets` keeps its leading key
 * position, a derived one is appended last, matching the historical shape.
 */
function resolveSearchMeta(spec: TaskSpec): TaskSearchMeta | undefined {
  const { configTargets, keywords, searchMeta, tags } = spec;
  if (
    configTargets === undefined &&
    keywords === undefined &&
    searchMeta === undefined &&
    tags === undefined
  ) {
    return undefined;
  }
  const authoredConfigTargets = configTargets ?? searchMeta?.configTargets;
  const authored = {
    keywords: keywords ?? searchMeta?.keywords ?? [],
    tags: tags ?? searchMeta?.tags ?? [],
  };
  if (authoredConfigTargets !== undefined) {
    return { configTargets: authoredConfigTargets, ...authored };
  }
  return {
    ...authored,
    configTargets: deriveConfigTargets(
      Array.isArray(spec.targets) ? spec.targets : undefined
    ),
  };
}

/**
 * Build one `defineTask` entry method: resolve the spec once, project the
 * resolution, and label failures at the boundary.
 */
function defineMethod<A>(
  spec: TaskSpec,
  method: string,
  project: (resolution: TaskResolution) => A
) {
  return (cwd: string, profile: ProjectProfile) =>
    labelFailure(
      spec.id,
      method,
      Effect.map(resolveSpec(spec, { cwd, profile }), project)
    );
}

/**
 * Build a Task from a declarative spec. One resolution produces the status, the
 * diffs, and the dependency list, so check, dryRun, apply, and the apply plan
 * cannot disagree about the same project. The spec resolves lazily on each
 * invocation, and spec functions may be synchronous, async, or Effect-based.
 */
export function defineTask(spec: TaskSpec): DefinedTask {
  return {
    applicable: spec.applicable,
    apply(cwd, profile) {
      return labelFailure(
        spec.id,
        'defineTask.apply',
        applySpec(spec, { cwd, profile })
      );
    },
    check: defineMethod(spec, 'defineTask.check', (r) => r.status),
    dryRun: defineMethod(spec, 'defineTask.dryRun', (r) => r.diffs),
    getDeps: defineMethod(spec, 'defineTask.getDeps', (r) => r.deps),
    group: spec.group,
    id: spec.id,
    label: spec.label,
    scope: spec.scope,
    searchMeta: resolveSearchMeta(spec),
  };
}

/** defineTask sugar for the common case of exactly one static target. */
export function defineSingleTargetTask(
  spec: Omit<TaskSpec, 'targets'> & { target: TaskTarget }
): DefinedTask {
  return defineTask({ ...spec, targets: [spec.target] });
}
