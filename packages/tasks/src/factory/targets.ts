import type { FileDiff, ProjectProfile, TaskStatus } from '@xtarterize/core';
import { fileExists, readFile } from '@xtarterize/core';
import { mergeJson, parseJsonc, patchJson } from '@xtarterize/patchers';
import { relative } from 'pathe';

import {
  computePackageJsonChange,
  PACKAGE_JSON_FILENAME,
  readPackageJsonText,
} from './package-json.js';
import {
  getDefaultFilepath,
  normalizeLineEndings,
  resolveTaskFile,
} from './utils.js';

/** What a target policy hook sees: the pair the diff was computed from. */
export interface TargetPolicyInput {
  /** The text the target would write, equal to `before` when nothing changes. */
  after: string;
  /** The current file text, or null when the file does not exist yet. */
  before: string | null;
}

/**
 * Extra context a policy hook may need beyond the diff pair. Kept as a second
 * argument so `TargetPolicyInput` stays exactly the `before`/`after` pair the
 * diff was computed from.
 */
export interface TargetPolicyContext {
  profile: ProjectProfile;
}

/**
 * Optional per-target override. Returning a status wins over the default
 * projection; returning undefined keeps it. Use it to report `conflict` when an
 * existing value cannot be reconciled, such as a disabled strict option.
 */
export type TargetPolicy = (
  input: TargetPolicyInput,
  context: TargetPolicyContext
) => TaskStatus | undefined;

interface TargetBase {
  extensions?: Array<string>;
  filepath: string;
  policy?: TargetPolicy;
}

export interface TextTarget extends TargetBase {
  kind: 'text';
  render: (profile: ProjectProfile, existing: string | null) => string;
}

export interface JsonMergeTarget extends TargetBase {
  incoming: (cwd: string, profile: ProjectProfile) => object | Promise<object>;
  kind: 'jsonMerge';
  merge?: (existing: object, incoming: object) => object;
}

export interface PackageJsonTarget {
  change: (cwd: string, profile: ProjectProfile) => object | Promise<object>;
  kind: 'packageJson';
  policy?: TargetPolicy;
}

export interface TransformTarget extends TargetBase {
  kind: 'transform';
  transform: (content: string, profile: ProjectProfile) => string | null;
}

export type TaskTarget =
  | TextTarget
  | JsonMergeTarget
  | PackageJsonTarget
  | TransformTarget;

export type ResolvedTarget =
  | {
      diff: FileDiff | null;
      kind: 'text' | 'jsonMerge' | 'transform';
      status: TaskStatus;
    }
  | {
      diff: FileDiff | null;
      kind: 'packageJson';
      patch: object;
      status: TaskStatus;
    };

/** A resolved target plus the existence fact the dependency projection needs. */
export interface TargetDraft {
  /** True when the target file exists, including when it is zero bytes. */
  exists: boolean;
  target: ResolvedTarget;
}

export interface ResolveContext {
  cwd: string;
  profile: ProjectProfile;
}

/**
 * Targets may depend on project state and profile, such as profile-specific
 * hook paths or content derived from the current package.json.
 */
export type TargetResolver = (
  cwd: string,
  profile: ProjectProfile
) => Array<TaskTarget> | Promise<Array<TaskTarget>>;

interface FileState {
  before: string | null;
  exists: boolean;
  filepath: string;
  kind: 'text' | 'jsonMerge' | 'transform';
}

async function resolveFileState(
  cwd: string,
  target: TextTarget | JsonMergeTarget | TransformTarget
): Promise<FileState> {
  const fullPath = await resolveTaskFile(
    cwd,
    target.filepath,
    target.extensions
  );
  const exists = fullPath !== null && (await fileExists(fullPath));
  return {
    before: exists ? await readFile(fullPath) : null,
    exists,
    filepath: exists
      ? relative(cwd, fullPath)
      : getDefaultFilepath(target.filepath, target.extensions),
    kind: target.kind,
  };
}

/** Project the status policy and the skip rule onto the shared draft shape. */
function buildDraft(
  state: FileState,
  after: string,
  status: TaskStatus
): TargetDraft {
  const { before, exists, filepath, kind } = state;
  const diff = status === 'skip' ? null : { after, before, filepath };
  return { exists, target: { diff, kind, status } };
}

async function resolveTextTarget(
  target: TextTarget,
  context: ResolveContext
): Promise<TargetDraft> {
  const { cwd, profile } = context;
  const state = await resolveFileState(cwd, target);
  const { before } = state;
  const after = target.render(profile, before);
  const fallback: TaskStatus = state.exists
    ? normalizeLineEndings((before ?? '').trim()) ===
      normalizeLineEndings(after.trim())
      ? 'skip'
      : 'conflict'
    : 'new';
  const status = target.policy?.({ after, before }, { profile }) ?? fallback;
  return buildDraft(state, after, status);
}

function mergeIncoming(
  before: string,
  incoming: object,
  merge?: (existing: object, incoming: object) => object
): object {
  const parsed = parseJsonc(before);
  const existing = typeof parsed === 'object' && parsed !== null ? parsed : {};
  return (merge ?? mergeJson)(existing, incoming);
}

async function resolveJsonMergeTarget(
  target: JsonMergeTarget,
  context: ResolveContext
): Promise<TargetDraft> {
  const { cwd, profile } = context;
  const state = await resolveFileState(cwd, target);
  const { before } = state;
  const incoming = await target.incoming(cwd, profile);
  const after =
    before === null
      ? JSON.stringify(incoming, null, 2)
      : patchJson(before, mergeIncoming(before, incoming, target.merge));
  const fallback: TaskStatus = state.exists
    ? after === before
      ? 'skip'
      : 'patch'
    : 'new';
  const status = target.policy?.({ after, before }, { profile }) ?? fallback;
  return buildDraft(state, after, status);
}

async function resolvePackageJsonTarget(
  target: PackageJsonTarget,
  context: ResolveContext
): Promise<TargetDraft> {
  const { cwd, profile } = context;
  const patch = await target.change(cwd, profile);
  const change = await computePackageJsonChange(cwd, patch);
  const before = change ? change.before : await readPackageJsonText(cwd);
  const after = change ? change.after : (before ?? '');
  const fallback: TaskStatus = change
    ? change.before === null
      ? 'new'
      : 'patch'
    : 'skip';
  const status = target.policy?.({ after, before }, { profile }) ?? fallback;
  const resolved: ResolvedTarget = {
    diff:
      status === 'skip'
        ? null
        : {
            after,
            before,
            filepath: change?.filepath ?? PACKAGE_JSON_FILENAME,
          },
    kind: 'packageJson',
    patch,
    status,
  };
  return { exists: before !== null, target: resolved };
}

async function resolveTransformTarget(
  target: TransformTarget,
  context: ResolveContext
): Promise<TargetDraft> {
  const { cwd, profile } = context;
  const state = await resolveFileState(cwd, target);
  if (!state.exists) {
    // A transform cannot create content, so an absent file has no diff.
    return {
      exists: false,
      target: { diff: null, kind: 'transform', status: 'new' },
    };
  }
  const before = state.before ?? '';
  const transformed = target.transform(before, profile);
  const after = transformed ?? before;
  const fallback: TaskStatus =
    transformed === null || after === before ? 'skip' : 'patch';
  const status = target.policy?.({ after, before }, { profile }) ?? fallback;
  return buildDraft(state, after, status);
}

export function resolveTarget(
  target: TaskTarget,
  context: ResolveContext
): Promise<TargetDraft> {
  switch (target.kind) {
    case 'text':
      return resolveTextTarget(target, context);
    case 'jsonMerge':
      return resolveJsonMergeTarget(target, context);
    case 'packageJson':
      return resolvePackageJsonTarget(target, context);
    case 'transform':
      return resolveTransformTarget(target, context);
  }
}

function expandFilepath(
  filepath: string,
  extensions: Array<string> | undefined
): Array<string> {
  if (!extensions || extensions.length === 0) {
    return [filepath];
  }
  const declaredExtension = extensions.find((extension) =>
    filepath.endsWith(extension)
  );
  if (declaredExtension === undefined) {
    return extensions.map((extension) => `${filepath}${extension}`);
  }
  const base = filepath.slice(0, -declaredExtension.length);
  return extensions.map((extension) => `${base}${extension}`);
}

/**
 * Derive search `configTargets` from the declared targets: the filepath when
 * it carries no extension, otherwise every extension variant. Resolver targets
 * are profile-dependent, so their authors declare `configTargets` explicitly.
 */
export function deriveConfigTargets(
  targets: Array<TaskTarget> | TargetResolver | undefined
): Array<string> {
  if (targets === undefined || typeof targets === 'function') {
    return [];
  }
  const derived: Array<string> = [];
  for (const target of targets) {
    if (target.kind === 'packageJson') {
      derived.push(PACKAGE_JSON_FILENAME);
    } else {
      derived.push(...expandFilepath(target.filepath, target.extensions));
    }
  }
  return [...new Set(derived)];
}
