import type { ProjectProfile } from '@xtarterize/core';
import { fileExists, readPackageJson, resolvePath } from '@xtarterize/core';
import { dlxCommand, type PackageManagerName, runScriptCommand } from 'nypm';
import type { PackageJson } from 'pkg-types';

import {
  defineTask,
  type TargetPolicy,
  type TaskTarget,
} from '@/factory/define-task.js';
import {
  filterMissingScripts,
  hasInstalledDependency,
  toScriptsMap,
  toScriptsPatch,
} from '@/factory/scripts.js';

const HOOK_NAMES = [
  'commit-msg',
  'prepare-commit-msg',
  'pre-commit',
  'pre-push',
] as const;

type HookName = (typeof HOOK_NAMES)[number];

const CANDIDATES = [{ script: 'prepare', value: 'husky' }];

function commitMsgHook(pm: PackageManagerName): string {
  return `${dlxCommand(pm, 'commitlint', { short: true })} --edit $1\n`;
}

function preCommitHook(
  pkg: PackageJson | null,
  profile: ProjectProfile
): string {
  if (profile.vitePlus) {
    return 'vp staged\n';
  }
  const pm = profile.packageManager;
  return hasInstalledDependency(pkg, 'lint-staged')
    ? `${dlxCommand(pm, 'lint-staged', { short: true })}\n`
    : `${dlxCommand(pm, 'biome', { short: true })} check --write\n`;
}

function prePushHook(profile: ProjectProfile): string {
  const pm = profile.packageManager;
  if (profile.monorepoTool === 'turbo') {
    return `${runScriptCommand(pm, 'check:turbo')}\n`;
  }
  if (profile.typescript) {
    return `${runScriptCommand(pm, 'typecheck')} && ${runScriptCommand(pm, 'test')}\n`;
  }
  return `${runScriptCommand(pm, 'test')}\n`;
}

function prepareCommitMsgHook(
  pkg: PackageJson | null,
  profile: ProjectProfile
): string {
  const hasCz =
    hasInstalledDependency(pkg, 'czg') ||
    hasInstalledDependency(pkg, 'commitizen');
  if (!hasCz) {
    return '# no-op: no commit wizard detected\nexit 0\n';
  }
  const pm = profile.packageManager;
  return `exec < /dev/tty && ${runScriptCommand(pm, 'cz')} --hook || true\n`;
}

function renderHookContents(
  pkg: PackageJson | null,
  profile: ProjectProfile
): Record<HookName, string> {
  return {
    'commit-msg': commitMsgHook(profile.packageManager),
    'pre-commit': preCommitHook(pkg, profile),
    'pre-push': prePushHook(profile),
    'prepare-commit-msg': prepareCommitMsgHook(pkg, profile),
  };
}

function hookFilepath(profile: ProjectProfile, name: HookName): string {
  return profile.vitePlus ? `.vite-hooks/${name}` : `.husky/${name}`;
}

async function allHooksExist(
  cwd: string,
  profile: ProjectProfile
): Promise<boolean> {
  for (const name of HOOK_NAMES) {
    if (!(await fileExists(resolvePath(cwd, hookFilepath(profile, name))))) {
      return false;
    }
  }
  return true;
}

function hookTarget(options: {
  content: string;
  name: HookName;
  policy: TargetPolicy;
  profile: ProjectProfile;
}): TaskTarget {
  return {
    filepath: hookFilepath(options.profile, options.name),
    kind: 'text',
    policy: options.policy,
    render: () => options.content,
  };
}

export const gitHooksTask = defineTask({
  applicable: () => true,
  deps: (_resolution, { profile }) =>
    profile.vitePlus ? [] : [{ depName: 'husky', dev: true }],
  group: 'Release',
  id: 'release/git-hooks',
  label: 'Git hooks (commit-msg, prepare-commit-msg, pre-commit, pre-push)',
  scope: 'root',
  searchMeta: {
    configTargets: [
      '.husky/commit-msg',
      '.husky/prepare-commit-msg',
      '.husky/pre-commit',
      '.husky/pre-push',
    ],
    keywords: [
      'git hooks',
      'husky',
      'pre-commit',
      'commit-msg',
      'prepare-commit-msg',
      'commitizen',
      'czg',
      'quality gates',
    ],
    tags: ['git', 'hooks', 'husky', 'quality'],
  },
  targets: async (cwd, profile) => {
    const pkg = await readPackageJson(cwd);
    const [hooksExist, contents] = await Promise.all([
      allHooksExist(cwd, profile),
      renderHookContents(pkg, profile),
    ]);
    const missingScripts = filterMissingScripts(
      toScriptsMap((pkg?.scripts as Record<string, unknown> | undefined) ?? {}),
      CANDIDATES
    );
    const forceNew =
      !(profile.vitePlus || hooksExist) &&
      missingScripts.length === CANDIDATES.length &&
      !hasInstalledDependency(pkg, 'husky');
    const filePolicy: TargetPolicy = ({ before }) => {
      if (before !== null) {
        // Existing hook scripts were never compared or overwritten.
        return 'skip';
      }
      return forceNew ? undefined : 'patch';
    };
    const targets: Array<TaskTarget> = HOOK_NAMES.map((name) =>
      hookTarget({ content: contents[name], name, policy: filePolicy, profile })
    );
    if (!profile.vitePlus) {
      targets.push({
        change: () => toScriptsPatch(missingScripts),
        kind: 'packageJson',
        policy: () => (forceNew ? 'new' : undefined),
      });
    }
    return targets;
  },
});
