import fs from 'node:fs/promises';
import { dirname, relative } from 'pathe';

import { fileExists, resolvePath } from '@/utils/fs.js';

import type { MonorepoDetection } from './types.js';

const MONOREPO_MARKERS = ['turbo.json', 'nx.json', 'lerna.json'];
/** A top-level `packages:` key, optionally quoted. */
const PNPM_PACKAGES_KEY = /^(?:packages|'packages'|"packages")[ \t]*:/m;
const WORKSPACE_DIR_NAMES = ['packages', 'apps', 'services'];
const WORKSPACE_PACKAGE_DIRS = WORKSPACE_DIR_NAMES.map((dir) => `${dir}/`);

/** A directory must contain at least two workspace dirs to count as a root. */
const MIN_WORKSPACE_DIRS = 2;

async function hasWorkspaceDirs(dir: string): Promise<boolean> {
  const results = await Promise.all(
    WORKSPACE_DIR_NAMES.map((name) => fileExists(resolvePath(dir, name)))
  );
  return results.filter(Boolean).length >= MIN_WORKSPACE_DIRS;
}

/**
 * pnpm 10 keeps settings such as `onlyBuiltDependencies` in
 * pnpm-workspace.yaml, so single-package projects often have one (and the
 * `workspace/pnpm-workspace` task creates a placeholder). Only a file that
 * declares `packages:` marks a workspace; counting any file would flip the
 * profile to a monorepo after the first run and break idempotency.
 */
async function declaresPnpmPackages(dir: string): Promise<boolean> {
  try {
    const content = await fs.readFile(
      resolvePath(dir, 'pnpm-workspace.yaml'),
      'utf-8'
    );
    return PNPM_PACKAGES_KEY.test(content);
  } catch {
    return false;
  }
}

async function hasMonorepoMarkers(dir: string): Promise<boolean> {
  const results = await Promise.all([
    declaresPnpmPackages(dir),
    ...MONOREPO_MARKERS.map((m) => fileExists(resolvePath(dir, m))),
  ]);
  if (results.some(Boolean)) {
    return true;
  }
  return hasWorkspaceDirs(dir);
}

function detectMonorepoTool(flags: {
  hasTurboJson: boolean;
  hasNxJson: boolean;
  hasLernaJson: boolean;
}): 'turbo' | 'nx' | 'lerna' | null {
  if (flags.hasTurboJson) {
    return 'turbo';
  }
  if (flags.hasNxJson) {
    return 'nx';
  }
  if (flags.hasLernaJson) {
    return 'lerna';
  }
  return null;
}

async function walkWorkspaceParents(
  cwd: string
): Promise<MonorepoDetection | null> {
  let current = dirname(cwd);
  while (current !== dirname(current)) {
    if (await hasMonorepoMarkers(current)) {
      const rel = relative(current, cwd);
      const inWorkspacePackage = WORKSPACE_PACKAGE_DIRS.some((p) =>
        rel.startsWith(p)
      );
      if (inWorkspacePackage) {
        const [hasTurbo, hasNx, hasLerna] = await Promise.all([
          fileExists(resolvePath(current, 'turbo.json')),
          fileExists(resolvePath(current, 'nx.json')),
          fileExists(resolvePath(current, 'lerna.json')),
        ]);
        return {
          monorepo: true,
          monorepoTool: detectMonorepoTool({
            hasLernaJson: hasLerna,
            hasNxJson: hasNx,
            hasTurboJson: hasTurbo,
          }),
          workspaceRoot: false,
        };
      }
    }
    if (await fileExists(resolvePath(current, '.git'))) {
      break;
    }
    current = dirname(current);
  }
  return null;
}

/**
 * Detects monorepo structure and tooling
 * @param cwd - Current working directory
 * @returns Monorepo detection information
 */
export async function detectMonorepo(cwd: string): Promise<MonorepoDetection> {
  const [
    hasPnpmWorkspace,
    hasTurboJson,
    hasNxJson,
    hasLernaJson,
    hasWorkspaceDirsAtRoot,
  ] = await Promise.all([
    declaresPnpmPackages(cwd),
    fileExists(resolvePath(cwd, 'turbo.json')),
    fileExists(resolvePath(cwd, 'nx.json')),
    fileExists(resolvePath(cwd, 'lerna.json')),
    hasWorkspaceDirs(cwd),
  ]);
  const monorepo =
    hasPnpmWorkspace ||
    hasTurboJson ||
    hasNxJson ||
    hasLernaJson ||
    hasWorkspaceDirsAtRoot;
  const monorepoTool = detectMonorepoTool({
    hasLernaJson,
    hasNxJson,
    hasTurboJson,
  });
  if (!monorepo) {
    const parentResult = await walkWorkspaceParents(cwd);
    if (parentResult) {
      return parentResult;
    }
  }
  return { monorepo, monorepoTool, workspaceRoot: monorepo };
}
