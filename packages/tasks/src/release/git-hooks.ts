import type { ProjectProfile } from '@xtarterize/core';
import { fileExists, readPackageJson, resolvePath } from '@xtarterize/core';
import { dlxCommand, type PackageManagerName, runScriptCommand } from 'nypm';

import {
  defineTask,
  type TargetPolicy,
  type TaskTarget,
} from '@/factory/define-task.js';
import {
  hasInstalledDependency,
  resolveScriptsResolution,
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

async function preCommitHook(
  cwd: string,
  profile: ProjectProfile
): Promise<string> {
  if (profile.vitePlus) {
    return 'vp staged\n';
  }
  const pkg = await readPackageJson(cwd);
  const hasLintStaged = !!(
    pkg?.devDependencies?.['lint-staged'] || pkg?.dependencies?.['lint-staged']
  );
  const pm = profile.packageManager;
  return hasLintStaged
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

async function prepareCommitMsgHook(
  cwd: string,
  profile: ProjectProfile
): Promise<string> {
  const pkg = await readPackageJson(cwd);
  const hasCz = !!(
    pkg?.devDependencies?.czg ||
    pkg?.dependencies?.czg ||
    pkg?.devDependencies?.commitizen ||
    pkg?.dependencies?.commitizen
  );
  if (!hasCz) {
    return '# no-op: no commit wizard detected\nexit 0\n';
  }
  const pm = profile.packageManager;
  return `exec < /dev/tty && ${runScriptCommand(pm, 'cz')} --hook || true\n`;
}

async function renderHookContents(
  cwd: string,
  profile: ProjectProfile
): Promise<Record<HookName, string>> {
  return {
    'commit-msg': commitMsgHook(profile.packageManager),
    'pre-commit': await preCommitHook(cwd, profile),
    'pre-push': prePushHook(profile),
    'prepare-commit-msg': await prepareCommitMsgHook(cwd, profile),
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
    const [contents, hooksExist] = await Promise.all([
      renderHookContents(cwd, profile),
      allHooksExist(cwd, profile),
    ]);
    const scripts = profile.vitePlus
      ? null
      : await resolveScriptsResolution(cwd, CANDIDATES);
    const forceNew =
      scripts !== null &&
      !hooksExist &&
      scripts.missingScripts.length === CANDIDATES.length &&
      !hasInstalledDependency(scripts.pkg, 'husky');
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
    if (scripts !== null) {
      targets.push({
        change: () => toScriptsPatch(scripts.missingScripts),
        kind: 'packageJson',
        policy: () => (forceNew ? 'new' : undefined),
      });
    }
    return targets;
  },
});
