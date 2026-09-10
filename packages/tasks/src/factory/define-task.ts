import type {
  FileDiff,
  ProjectProfile,
  Task,
  TaskScope,
  TaskSearchMeta,
  TaskStatus,
} from '@xtarterize/core';

import { checkMissingDeps, wrapTask, writeTaskDiffs } from './ops.js';
import { applyPackageJsonChange } from './package-json.js';
import {
  deriveConfigTargets,
  type ResolveContext,
  type ResolvedTarget,
  resolveTarget,
  type TargetDraft,
  type TargetResolver,
  type TaskTarget,
} from './targets.js';

export type {
  JsonMergeTarget,
  PackageJsonTarget,
  ResolvedTarget,
  TargetPolicy,
  TargetPolicyContext,
  TargetPolicyInput,
  TargetResolver,
  TaskTarget,
  TextTarget,
  TransformTarget,
} from './targets.js';

/** A dependency the apply plan installs before tasks run. */
export interface TaskDep {
  depName: string;
  dev: boolean;
}

export interface TaskAction {
  check: (cwd: string, profile: ProjectProfile) => Promise<TaskStatus>;
  kind: 'action';
  run: (cwd: string, profile: ProjectProfile) => Promise<void>;
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
) => Array<TaskDep> | Promise<Array<TaskDep>>;

export type DepsDeclaration = Array<TaskDep> | DepResolver;

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
  deps?: DepsDeclaration;
  group: string;
  id: string;
  label: string;
  scope?: TaskScope;
  searchMeta?: SpecSearchMeta;
  targets?: Array<TaskTarget> | TargetResolver;
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

async function resolveDeps(
  declaration: DepsDeclaration | undefined,
  resolution: SpecResolution,
  context: ResolveContext
): Promise<Array<TaskDep>> {
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

async function resolveSpec(
  spec: TaskSpec,
  context: ResolveContext
): Promise<TaskResolution> {
  const declaredTargets =
    typeof spec.targets === 'function'
      ? await spec.targets(context.cwd, context.profile)
      : (spec.targets ?? []);
  const drafts: Array<TargetDraft> = [];
  for (const target of declaredTargets) {
    drafts.push(await resolveTarget(target, context));
  }
  const actionStatuses: Array<TaskStatus> = [];
  for (const action of spec.actions ?? []) {
    actionStatuses.push(await action.check(context.cwd, context.profile));
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
  const deps = await resolveDeps(spec.deps, provisional, context);
  const targets = await applyDependencyStatus(drafts, deps, context.cwd);
  return {
    deps,
    diffs: collectDiffs(targets),
    status: combineStatuses([
      ...targets.map((target) => target.status),
      ...actionStatuses,
    ]),
    targets,
  };
}

async function applySpec(
  spec: TaskSpec,
  context: ResolveContext
): Promise<void> {
  const { cwd, profile } = context;
  const { targets } = await resolveSpec(spec, context);
  const diffs: Array<FileDiff> = [];
  for (const target of targets) {
    if (target.kind === 'packageJson') {
      await applyPackageJsonChange(cwd, target.patch);
      continue;
    }
    if (target.diff) {
      diffs.push(target.diff);
    }
  }
  await writeTaskDiffs(cwd, diffs);
  for (const action of spec.actions ?? []) {
    await action.run(cwd, profile);
  }
}

/**
 * Merge authored metadata with derived `configTargets`. Keywords and tags stay
 * authored; only targets the spec declares statically can be derived.
 */
function resolveSearchMeta(spec: TaskSpec): TaskSearchMeta | undefined {
  if (spec.searchMeta === undefined) {
    return undefined;
  }
  return {
    ...spec.searchMeta,
    configTargets:
      spec.searchMeta.configTargets ?? deriveConfigTargets(spec.targets),
  };
}

/**
 * Build a Task from a declarative spec. One resolution produces the status, the
 * diffs, and the dependency list, so check, dryRun, apply, and the apply plan
 * cannot disagree about the same project.
 */
export function defineTask(spec: TaskSpec): Task {
  return {
    applicable: spec.applicable,
    async apply(cwd, profile): Promise<void> {
      return wrapTask(spec.id, 'defineTask.apply', () =>
        applySpec(spec, { cwd, profile })
      );
    },
    async check(cwd, profile): Promise<TaskStatus> {
      return wrapTask(spec.id, 'defineTask.check', async () => {
        const resolution = await resolveSpec(spec, { cwd, profile });
        return resolution.status;
      });
    },
    async dryRun(cwd, profile): Promise<Array<FileDiff>> {
      return wrapTask(spec.id, 'defineTask.dryRun', async () => {
        const resolution = await resolveSpec(spec, { cwd, profile });
        return resolution.diffs;
      });
    },
    async getDeps(cwd, profile) {
      return wrapTask(spec.id, 'defineTask.getDeps', async () => {
        const resolution = await resolveSpec(spec, { cwd, profile });
        return resolution.deps;
      });
    },
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
): Task {
  return defineTask({ ...spec, targets: [spec.target] });
}
