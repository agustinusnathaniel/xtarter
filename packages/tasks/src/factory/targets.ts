import type { FileDiff, ProjectProfile, TaskStatus } from '@xtarterize/core';
import { fileExists, readFile } from '@xtarterize/core';
import { mergeJson, parseJsonc, patchJson } from '@xtarterize/patchers';
import { relative } from 'pathe';

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
 * Optional per-target override. Returning a status wins over the default
 * projection; returning undefined keeps it. Use it to report `conflict` when an
 * existing value cannot be reconciled, such as a disabled strict option.
 */
export type TargetPolicy = (
  input: TargetPolicyInput,
  profile: ProjectProfile
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

/** A JSON merge patch applied to `package.json`; the patch's values win. */
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

export interface ResolvedTarget {
  diff: FileDiff | null;
  status: TaskStatus;
}

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

interface FileState {
  before: string | null;
  exists: boolean;
  filepath: string;
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
  };
}

/** Project the status policy and the skip rule onto the shared draft shape. */
function buildDraft(
  state: FileState,
  after: string,
  status: TaskStatus
): TargetDraft {
  const { before, exists, filepath } = state;
  const diff = status === 'skip' ? null : { after, before, filepath };
  return { exists, target: { diff, status } };
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
  const status = target.policy?.({ after, before }, profile) ?? fallback;
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
  const status = target.policy?.({ after, before }, profile) ?? fallback;
  return buildDraft(state, after, status);
}

function packageJsonAsJsonMerge(target: PackageJsonTarget): JsonMergeTarget {
  return {
    filepath: 'package.json',
    incoming: target.change,
    kind: 'jsonMerge',
    merge: (_existing, incoming) => incoming,
    policy: target.policy,
  };
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
      target: { diff: null, status: 'new' },
    };
  }
  const before = state.before ?? '';
  const transformed = target.transform(before, profile);
  const after = transformed ?? before;
  const fallback: TaskStatus =
    transformed === null || after === before ? 'skip' : 'patch';
  const status = target.policy?.({ after, before }, profile) ?? fallback;
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
      return resolveJsonMergeTarget(packageJsonAsJsonMerge(target), context);
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
export function deriveConfigTargets(targets: Array<TaskTarget>): Array<string> {
  const derived: Array<string> = [];
  for (const target of targets) {
    if (target.kind === 'packageJson') {
      derived.push('package.json');
    } else {
      derived.push(...expandFilepath(target.filepath, target.extensions));
    }
  }
  return [...new Set(derived)];
}
