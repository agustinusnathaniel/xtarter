import type { PackageJson } from 'pkg-types';

import {
  fileExists,
  findConfigFile,
  readFile,
  resolvePath,
} from '@/utils/fs.js';
import { readPackageJson } from '@/utils/pkg.js';

import { detectBundler } from './detect/bundler.js';
import {
  computeFingerprint,
  isCacheValid,
  PROFILE_CACHE_VERSION,
  readProfileCache,
  writeProfileCache,
} from './detect/cache.js';
import { detectMonorepo } from './detect/monorepo.js';
import {
  detectFrameworkVersion,
  detectPackageManager,
  isStringRecord,
} from './detect/package-manager.js';
import {
  type ConfigDirInput,
  type CustomDetectorEntry,
  completeExistingConfig,
  configDirInputsFor,
  EXISTING_ENTRIES,
  type ExistingConfig,
  type ExistingEntry,
  type ExistingValue,
  isFileDetectorEntry,
  type RootFileInput,
  rootFileInputFor,
  rootFileInputsFor,
} from './detect/registry/index.js';
import type {
  Bundler,
  Framework,
  MonorepoDetection,
  PackageManager,
  ProjectProfile,
  Router,
  Styling,
} from './detect/types.js';

export type {
  Bundler,
  Framework,
  MonorepoDetection,
  PackageManager,
  ProjectProfile,
  Router,
  Styling,
};
export { detectPackageManager };

// ── Inline framework detection (was detect/framework.ts) ──

export function detectFramework(deps: Record<string, string>): Framework {
  const hasReactNative = !!(deps['react-native'] || deps.expo);
  const hasReact = !!deps.react;
  const hasVue = !!deps.vue;
  const hasSvelte = !!deps.svelte;
  const hasSolid = !!deps['solid-js'];

  if (hasReactNative) {
    return 'react-native';
  }
  if (hasReact) {
    return 'react';
  }
  if (hasVue) {
    return 'vue';
  }
  if (hasSvelte) {
    return 'svelte';
  }
  if (hasSolid) {
    return 'solid';
  }
  return 'node';
}

function detectRuntime(
  framework: Framework,
  bundler: Bundler
): 'browser' | 'node' | 'edge' | 'native' | 'universal' {
  if (framework === 'react-native') {
    return 'native';
  }
  if (bundler === 'expo') {
    return 'native';
  }
  if (bundler === 'nextjs') {
    return 'edge';
  }
  if (bundler === 'tanstack-start') {
    return 'edge';
  }
  // Node framework takes precedence over bundler detection
  if (framework === 'node') {
    return 'node';
  }
  if (bundler === 'vite' || bundler === 'webpack' || bundler === 'rspack') {
    return 'browser';
  }
  return 'browser';
}

function detectVitePlus(deps: Record<string, string>): boolean {
  return 'vite-plus' in deps || 'vp' in deps;
}

// ── Inline router detection (was detect/router.ts) ──

function detectRouter(deps: Record<string, string>, bundler: Bundler): Router {
  if (bundler === 'nextjs') {
    return 'next';
  }
  if (bundler === 'expo') {
    return 'expo-router';
  }
  if (deps['@tanstack/react-router']) {
    return 'tanstack-router';
  }
  if (deps['react-router'] || deps['react-router-dom']) {
    return 'react-router';
  }
  if (deps['vue-router']) {
    return 'vue-router';
  }
  return null;
}

// ── Inline styling detection (was detect/styling.ts) ──

function detectStyling(deps: Record<string, string>): Array<Styling> {
  const result: Array<Styling> = [];
  if (deps.tailwindcss || deps['@tailwindcss/vite']) {
    result.push('tailwind');
  }
  if (deps['styled-components']) {
    result.push('styled-components');
  }
  if (deps['@vanilla-extract/css']) {
    result.push('vanilla-extract');
  }
  if (deps.nativewind) {
    result.push('nativewind');
  }
  if (result.length === 0) {
    result.push('vanilla');
  }
  return result;
}

// ── Custom detectors ──

interface CustomDetectorContext {
  cwd: string;
  deps: Record<string, string>;
  dirs: Array<ConfigDirInput>;
  files: Array<RootFileInput>;
}

type CustomDetectorMap = {
  [E in CustomDetectorEntry as E['id']]: (
    context: CustomDetectorContext
  ) => Promise<ExistingValue<E>>;
};

function detectRootFile(cwd: string, input: RootFileInput): Promise<boolean> {
  if (input.extensions.length === 0) {
    return fileExists(resolvePath(cwd, input.basename));
  }
  return findConfigFile(cwd, input.basename, [...input.extensions]).then(
    Boolean
  );
}

async function anyRootFileExists(
  cwd: string,
  inputs: Array<RootFileInput>
): Promise<boolean> {
  const results = await Promise.all(
    inputs.map((input) => detectRootFile(cwd, input))
  );
  return results.some(Boolean);
}

function detectAnyRootFile(context: CustomDetectorContext): Promise<boolean> {
  return anyRootFileExists(context.cwd, context.files);
}

async function detectEslint({
  cwd,
  deps,
  files,
}: CustomDetectorContext): Promise<boolean> {
  if (await anyRootFileExists(cwd, files)) {
    return true;
  }
  return Boolean(deps.eslint);
}

async function detectGitHubWorkflows({
  cwd,
  dirs,
}: CustomDetectorContext): Promise<Array<string>> {
  const githubDir = dirs[0];
  if (!githubDir) {
    return [];
  }

  const workflowsDir = resolvePath(cwd, githubDir.dir, 'workflows');
  if (!(await fileExists(workflowsDir))) {
    return [];
  }

  const { readdir } = await import('node:fs/promises');
  const entries = await readdir(workflowsDir);
  return entries
    .filter(
      (e): e is string =>
        typeof e === 'string' && (e.endsWith('.yml') || e.endsWith('.yaml'))
    )
    .map((e) => e.replace(/\.(yml|yaml)$/, ''));
}

async function detectChangeset({
  cwd,
  deps,
  dirs,
}: CustomDetectorContext): Promise<boolean> {
  const hasConfig = await Promise.all(
    dirs.map((dir) => fileExists(resolvePath(cwd, dir.dir, 'config.json')))
  ).then((results) => results.some(Boolean));
  if (hasConfig) {
    return true;
  }
  return Boolean(deps['@changesets/cli']);
}

const CUSTOM_DETECTORS: CustomDetectorMap = {
  agentsMd: detectAnyRootFile,
  changeset: detectChangeset,
  eslint: detectEslint,
  githubWorkflows: detectGitHubWorkflows,
  oxfmt: detectAnyRootFile,
  oxlint: detectAnyRootFile,
};

// ── Existing config assembly (registry-driven) ──

type ResolvedExisting = {
  key: ExistingEntry['key'];
  value: boolean | Array<string>;
};

function customDetectorContext(
  entry: CustomDetectorEntry,
  cwd: string,
  deps: Record<string, string>
): CustomDetectorContext {
  return {
    cwd,
    deps,
    dirs: configDirInputsFor(entry),
    files: rootFileInputsFor(entry),
  };
}

async function resolveExistingEntry(
  entry: ExistingEntry,
  cwd: string,
  deps: Record<string, string>
): Promise<ResolvedExisting> {
  if (isFileDetectorEntry(entry)) {
    return {
      key: entry.key,
      value: await detectRootFile(cwd, rootFileInputFor(entry)),
    };
  }

  return {
    key: entry.key,
    value: await CUSTOM_DETECTORS[entry.id](
      customDetectorContext(entry, cwd, deps)
    ),
  };
}

async function detectExistingConfigs(
  cwd: string,
  deps: Record<string, string>
): Promise<ExistingConfig> {
  const resolved = await Promise.all(
    EXISTING_ENTRIES.map((entry) => resolveExistingEntry(entry, cwd, deps))
  );

  const partial = Object.fromEntries(
    resolved.map((entry) => [entry.key, entry.value])
  ) as Partial<ExistingConfig>;

  return completeExistingConfig(partial);
}

async function detectNodeVersion(
  cwd: string,
  pkg: PackageJson | null
): Promise<string> {
  const nvmrcPath = resolvePath(cwd, '.nvmrc');
  const nvmrcExists = await fileExists(nvmrcPath);
  if (nvmrcExists) {
    const content = await readFile(nvmrcPath);
    const match = content.trim().match(/^v?(\d+)/);
    if (match) {
      return match[1];
    }
  }

  const enginesNode = pkg?.engines?.node;
  if (enginesNode) {
    const match = String(enginesNode).match(/\d+/);
    if (match) {
      return match[0];
    }
  }

  return '22';
}

function collectDeps(pkg: PackageJson | null): Record<string, string> {
  const deps: Record<string, string> = {};
  if (pkg && isStringRecord(pkg.dependencies)) {
    Object.assign(deps, pkg.dependencies);
  }
  if (pkg && isStringRecord(pkg.devDependencies)) {
    Object.assign(deps, pkg.devDependencies);
  }
  return deps;
}

// ── Internal detection logic (no caching) ──

async function computeProjectProfile(cwd: string): Promise<ProjectProfile> {
  const pkg = await readPackageJson(cwd);
  const deps = collectDeps(pkg);

  const [
    monorepoInfo,
    hasGitHub,
    hasGit,
    packageManager,
    nodeVersion,
    existing,
  ] = await Promise.all([
    detectMonorepo(cwd),
    fileExists(resolvePath(cwd, '.github')),
    fileExists(resolvePath(cwd, '.git')),
    detectPackageManager(cwd),
    detectNodeVersion(cwd, pkg),
    detectExistingConfigs(cwd, deps),
  ]);

  const base = {
    existing,
    hasGit,
    hasGitHub,
    monorepo: monorepoInfo.monorepo,
    monorepoTool: monorepoInfo.monorepoTool,
    nodeVersion,
    packageManager,
    workspaceRoot: monorepoInfo.workspaceRoot,
  };

  if (!pkg) {
    return {
      bundler: null,
      framework: null,
      frameworkVersion: null,
      router: null,
      runtime: 'node',
      styling: ['vanilla'],
      typescript: existing.tsconfig,
      vitePlus: false,
      ...base,
    };
  }

  const framework = detectFramework(deps);
  const bundler = await detectBundler(deps, cwd);
  const typescript = 'typescript' in deps || existing.tsconfig;

  return {
    bundler,
    framework,
    frameworkVersion: detectFrameworkVersion(pkg, framework),
    router: detectRouter(deps, bundler),
    runtime: detectRuntime(framework, bundler),
    styling: detectStyling(deps),
    typescript,
    vitePlus: detectVitePlus(deps),
    ...base,
  };
}

// ── Cached detection entry point ──

export async function detectProject(cwd: string): Promise<ProjectProfile> {
  const fingerprint = await computeFingerprint(cwd);
  const cached = await readProfileCache(cwd);
  if (cached && isCacheValid(cached, fingerprint)) {
    return cached.profile;
  }

  const start = performance.now();
  const profile = await computeProjectProfile(cwd);
  const durationMs = performance.now() - start;

  await writeProfileCache(cwd, {
    computedAt: new Date().toISOString(),
    durationMs,
    fingerprint,
    profile,
    version: PROFILE_CACHE_VERSION,
  });

  return profile;
}
