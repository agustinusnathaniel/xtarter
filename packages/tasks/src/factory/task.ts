import type {
  FileDiff,
  ProjectProfile,
  Task,
  TaskScope,
  TaskSearchMeta,
  TaskStatus,
} from '@xtarterize/core';
import {
  fileExists,
  installDependenciesBatch,
  readFile,
  readPackageJson,
  resolvePath,
  writeFile,
  writePackageJson,
} from '@xtarterize/core';
import { patchJson } from '@xtarterize/patchers';
import type { PackageJson } from 'pkg-types';

import { wrapTask } from './ops.js';
import {
  filterMissingScripts,
  mergeScripts,
  resolveScripts,
} from './scripts.js';

const __pkgCache = new Map<string, PackageJson | null>();

async function getPackageJson(cwd: string): Promise<PackageJson | null> {
  const cached = __pkgCache.get(cwd);
  if (cached !== undefined) {
    return cached;
  }
  const pkg = await readPackageJson(cwd);
  __pkgCache.set(cwd, pkg);
  return pkg;
}

function invalidatePackageJsonCache(cwd: string): void {
  __pkgCache.delete(cwd);
}

export interface PackageJsonScriptEntry {
  script: string;
  value: string;
}

export interface PackageJsonTaskDep {
  depName: string;
  installDev?: boolean;
  script?: string;
}

export interface PackageJsonTaskOptions {
  applicable: (profile: ProjectProfile) => boolean;
  checkFn?: (
    cwd: string,
    profile: ProjectProfile,
    pkg: Record<string, unknown>
  ) => Promise<TaskStatus>;
  depCondition?: (profile: ProjectProfile) => boolean;
  depName?: string;
  deps?: Array<PackageJsonTaskDep>;
  files?: Array<{
    filepath: string | ((profile: ProjectProfile) => string);
    render: (cwd: string, profile: ProjectProfile) => Promise<string> | string;
  }>;
  getDeps?: (
    cwd: string,
    profile: ProjectProfile
  ) => Promise<Array<PackageJsonTaskDep>>;
  getScripts?: (
    cwd: string,
    profile: ProjectProfile
  ) => Promise<Array<PackageJsonScriptEntry>>;
  group: string;
  id: string;
  installDev?: boolean;
  label: string;
  scope?: TaskScope;
  scripts?: Array<PackageJsonScriptEntry>;
  searchMeta?: TaskSearchMeta;
}

function resolveFilepath(
  filepath: string | ((profile: ProjectProfile) => string),
  profile: ProjectProfile
): string {
  return typeof filepath === 'function' ? filepath(profile) : filepath;
}

async function resolveDeps(
  options: PackageJsonTaskOptions,
  cwd: string,
  profile: ProjectProfile
): Promise<Array<PackageJsonTaskDep>> {
  if (options.getDeps) {
    return options.getDeps(cwd, profile);
  }
  if (options.deps) {
    return options.deps;
  }
  if (options.depName) {
    return [{ depName: options.depName, installDev: options.installDev }];
  }
  return [];
}

function filterDepsByMissingScripts(
  deps: Array<PackageJsonTaskDep>,
  missingScripts: Array<PackageJsonScriptEntry>
): Array<PackageJsonTaskDep> {
  const missingScriptNames = new Set(missingScripts.map((s) => s.script));
  return deps.filter(
    (dep) => !dep.script || missingScriptNames.has(dep.script)
  );
}

function shouldInstallDep(
  options: PackageJsonTaskOptions,
  profile: ProjectProfile
): boolean {
  return !!(
    options.depName &&
    (!options.depCondition || options.depCondition(profile))
  );
}

function getMissingDeps(
  deps: Array<PackageJsonTaskDep>,
  pkg: PackageJson | null
): Array<PackageJsonTaskDep> {
  if (!pkg) {
    return [];
  }
  return deps.filter(
    (dep) =>
      !(pkg.devDependencies?.[dep.depName] || pkg.dependencies?.[dep.depName])
  );
}

interface PackageJsonChanges {
  allDeps: Array<PackageJsonTaskDep>;
  missingFiles: Array<{ filepath: string; render: string }>;
  missingScripts: Array<PackageJsonScriptEntry>;
  neededDeps: Array<PackageJsonTaskDep>;
  pkg: PackageJson | null;
  scripts: Array<PackageJsonScriptEntry>;
}

async function computePackageJsonChanges(
  options: PackageJsonTaskOptions,
  cwd: string,
  profile: ProjectProfile
): Promise<PackageJsonChanges> {
  const pkg = await getPackageJson(cwd);

  const scripts = await resolveScripts(options, cwd, profile);
  const scriptsMap = pkg?.scripts ?? {};
  const missingScripts = filterMissingScripts(scriptsMap, scripts);

  const allDeps = await resolveDeps(options, cwd, profile);
  const neededDeps = filterDepsByMissingScripts(allDeps, missingScripts);

  const extraFiles = options.files ?? [];
  const missingFiles: Array<{ filepath: string; render: string }> = [];
  for (const f of extraFiles) {
    const fp = resolveFilepath(f.filepath, profile);
    const fullPath = resolvePath(cwd, fp);
    const exists = await fileExists(fullPath);
    if (!exists) {
      missingFiles.push({
        filepath: fp,
        render: await f.render(cwd, profile),
      });
    }
  }

  return { allDeps, missingFiles, missingScripts, neededDeps, pkg, scripts };
}

async function getPackageJsonTaskDeps(
  cwd: string,
  profile: ProjectProfile,
  options: PackageJsonTaskOptions
) {
  const changes = await computePackageJsonChanges(options, cwd, profile);
  return changes.neededDeps.map((d) => ({
    depName: d.depName,
    dev: d.installDev ?? true,
  }));
}

async function checkPackageJsonTask(
  cwd: string,
  profile: ProjectProfile,
  options: PackageJsonTaskOptions
): Promise<TaskStatus> {
  const changes = await computePackageJsonChanges(options, cwd, profile);
  const { pkg, allDeps } = changes;

  if (!pkg) {
    return 'conflict';
  }

  if (options.checkFn) {
    const status = await options.checkFn(cwd, profile, pkg);
    if (status === 'skip') {
      const missingDeps = getMissingDeps(allDeps, pkg);
      if (missingDeps.length > 0) {
        return 'patch';
      }
    }
    return status;
  }

  return resolvePackageJsonStatus(changes, options, profile);
}

function resolvePackageJsonStatus(
  changes: PackageJsonChanges,
  options: PackageJsonTaskOptions,
  profile: ProjectProfile
): TaskStatus {
  const { missingScripts, missingFiles } = changes;
  const needsDep = shouldInstallDep(options, profile);
  const depName = options.depName;
  const hasDep =
    !needsDep ||
    (depName &&
      (changes.pkg?.devDependencies?.[depName] ||
        changes.pkg?.dependencies?.[depName]));

  if (missingScripts.length === 0) {
    if (missingFiles.length > 0) {
      return 'patch';
    }
    return hasDep ? 'skip' : 'patch';
  }

  const extraFiles = options.files ?? [];
  if (
    missingScripts.length === changes.scripts.length &&
    missingFiles.length === extraFiles.length &&
    !(needsDep && hasDep)
  ) {
    return 'new';
  }

  return 'patch';
}

async function dryRunPackageJsonTask(
  cwd: string,
  profile: ProjectProfile,
  options: PackageJsonTaskOptions
): Promise<Array<FileDiff>> {
  const diffs: Array<FileDiff> = [];
  const changes = await computePackageJsonChanges(options, cwd, profile);
  const { missingScripts, neededDeps, missingFiles, pkg } = changes;

  for (const f of missingFiles) {
    diffs.push({
      after: f.render,
      before: null,
      filepath: f.filepath,
    });
  }

  await collectPackageJsonScriptDiff({ cwd, diffs, missingScripts, pkg });
  collectMissingDepsDiffs(neededDeps, pkg, diffs);

  return diffs;
}

async function collectPackageJsonScriptDiff(options: {
  cwd: string;
  missingScripts: Array<PackageJsonScriptEntry>;
  pkg: PackageJson | null;
  diffs: Array<FileDiff>;
}): Promise<void> {
  const { cwd, missingScripts, pkg, diffs } = options;
  const pkgPath = resolvePath(cwd, 'package.json');
  const pkgExists = await fileExists(pkgPath);
  if (pkgExists && pkg && missingScripts.length > 0) {
    const before = await readFile(pkgPath);
    const incomingScripts: Record<string, string> = {};
    for (const s of missingScripts) {
      incomingScripts[s.script] = s.value;
    }
    const after = patchJson(before, { scripts: incomingScripts });
    if (after !== before) {
      diffs.push({ after, before, filepath: 'package.json' });
    }
  }
}

function collectMissingDepsDiffs(
  neededDeps: Array<PackageJsonTaskDep>,
  pkg: PackageJson | null,
  diffs: Array<FileDiff>
): void {
  if (!pkg) {
    return;
  }
  const missingDeps = getMissingDeps(neededDeps, pkg);
  if (missingDeps.length === 0) {
    return;
  }
  const devDeps = missingDeps.filter((dep) => dep.installDev ?? true);
  const prodDeps = missingDeps.filter((dep) => !(dep.installDev ?? true));
  if (devDeps.length > 0) {
    diffs.push({
      after: devDeps.map((d) => d.depName).join('\n'),
      before: null,
      filepath: `devDependencies (${devDeps.map((d) => d.depName).join(', ')})`,
    });
  }
  if (prodDeps.length > 0) {
    diffs.push({
      after: prodDeps.map((d) => d.depName).join('\n'),
      before: null,
      filepath: `dependencies (${prodDeps.map((d) => d.depName).join(', ')})`,
    });
  }
}

async function applyPackageJsonTask(
  cwd: string,
  profile: ProjectProfile,
  options: PackageJsonTaskOptions
): Promise<void> {
  const changes = await computePackageJsonChanges(options, cwd, profile);
  const { missingScripts, neededDeps, missingFiles, pkg } = changes;

  for (const f of missingFiles) {
    const fullPath = resolvePath(cwd, f.filepath);
    await writeFile(fullPath, f.render);
  }

  if (pkg && missingScripts.length > 0) {
    pkg.scripts = mergeScripts(pkg.scripts, missingScripts);
    await writePackageJson(cwd, pkg);
    invalidatePackageJsonCache(cwd);
  }

  if (neededDeps.length > 0) {
    const deps = neededDeps.map((d) => ({
      depName: d.depName,
      dev: d.installDev ?? true,
    }));
    await installDependenciesBatch(cwd, deps);
  }
}

export function createPackageJsonTask(options: PackageJsonTaskOptions): Task {
  return {
    applicable: options.applicable,
    async apply(cwd, profile): Promise<void> {
      return wrapTask(options.id, 'createPackageJsonTask.apply', () =>
        applyPackageJsonTask(cwd, profile, options)
      );
    },
    async check(cwd, profile): Promise<TaskStatus> {
      return wrapTask(options.id, 'createPackageJsonTask.check', () =>
        checkPackageJsonTask(cwd, profile, options)
      );
    },
    async dryRun(cwd, profile): Promise<Array<FileDiff>> {
      return wrapTask(options.id, 'createPackageJsonTask.dryRun', () =>
        dryRunPackageJsonTask(cwd, profile, options)
      );
    },
    async getDeps(cwd, profile) {
      return getPackageJsonTaskDeps(cwd, profile, options);
    },
    group: options.group,
    id: options.id,
    label: options.label,
    scope: options.scope,
    searchMeta: options.searchMeta,
  };
}
