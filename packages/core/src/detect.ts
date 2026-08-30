import {
  fileExists,
  findConfigFile,
  readFile,
  resolvePath,
} from '@/utils/fs.js';
import { readPackageJson } from '@/utils/pkg.js';

import {
  computeFingerprint,
  isCacheValid,
  readProfileCache,
  writeProfileCache,
} from './detect/cache.js';
import {
  type DetectorRootInput,
  ROOT_DETECTOR_INPUTS,
} from './detect/root-inputs.js';
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

import { detectBundler } from './detect/bundler.js';
import { detectMonorepo } from './detect/monorepo.js';
import {
  detectFrameworkVersion,
  detectPackageManager,
  isStringRecord,
} from './detect/package-manager.js';

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

// ── Declarative file-existence detectors ──

interface FileDetectorSpec {
  basename: string;
  extensions: Array<string>;
  key: keyof ProjectProfile['existing'];
}

const FILE_DETECTORS: Array<FileDetectorSpec> = [
  ...ROOT_DETECTOR_INPUTS.filter(
    (
      input
    ): input is DetectorRootInput & {
      key: keyof ProjectProfile['existing'];
    } => input.key !== undefined
  ).map(({ key, basename, extensions }) => ({ basename, extensions, key })),
  {
    basename: '.vscode/settings',
    extensions: ['.json'],
    key: 'vscodeSettings',
  },
];

// ── Custom detectors for complex cases ──

async function detectEslint(
  cwd: string,
  deps?: Record<string, string>
): Promise<boolean> {
  const hasConfigFile = await findConfigFile(cwd, '.eslintrc', [
    '.js',
    '.cjs',
    '.json',
    '.yaml',
    '.yml',
  ]).then(Boolean);
  if (hasConfigFile) {
    return true;
  }

  const hasFlatConfig = await findConfigFile(cwd, 'eslint.config', [
    '.js',
    '.mjs',
    '.cjs',
    '.ts',
    '.mts',
    '.cts',
  ]).then(Boolean);
  if (hasFlatConfig) {
    return true;
  }

  if (deps) {
    return !!deps.eslint;
  }
  const pkg = await readPackageJson(cwd);
  return !!(pkg?.devDependencies?.eslint ?? pkg?.dependencies?.eslint);
}

async function detectGitHubWorkflows(cwd: string): Promise<Array<string>> {
  const workflowsDir = resolvePath(cwd, '.github', 'workflows');
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

async function detectChangeset(
  cwd: string,
  deps?: Record<string, string>
): Promise<boolean> {
  const hasConfig = await fileExists(
    resolvePath(cwd, '.changeset', 'config.json')
  );
  if (hasConfig) {
    return true;
  }
  if (deps) {
    return !!deps['@changesets/cli'];
  }
  const pkg = await readPackageJson(cwd);
  return !!(
    pkg?.devDependencies?.['@changesets/cli'] ??
    pkg?.dependencies?.['@changesets/cli']
  );
}

async function detectAgentsMd(cwd: string): Promise<boolean> {
  const found = await findConfigFile(cwd, 'AGENTS', ['.md']).then(Boolean);
  if (found) {
    return true;
  }
  return fileExists(resolvePath(cwd, 'CLAUDE.md'));
}

async function detectOxlint(cwd: string): Promise<boolean> {
  const oldFormat = await findConfigFile(cwd, '.oxlintrc', [
    '.json',
    '.jsonc',
  ]).then(Boolean);
  if (oldFormat) {
    return true;
  }

  return findConfigFile(cwd, 'oxlint.config', ['.ts', '.js', '.mjs']).then(
    Boolean
  );
}

async function detectOxfmt(cwd: string): Promise<boolean> {
  const oldFormat = await findConfigFile(cwd, '.oxfmtrc', [
    '.json',
    '.jsonc',
  ]).then(Boolean);
  if (oldFormat) {
    return true;
  }

  return findConfigFile(cwd, 'oxfmt.config', ['.ts', '.js', '.mjs']).then(
    Boolean
  );
}

// ── Custom detectors ──

type CustomDetector = {
  key: keyof ProjectProfile['existing'];
  detect: (
    cwd: string,
    deps?: Record<string, string>
  ) => Promise<boolean | Array<string>>;
};

const CUSTOM_DETECTORS: Array<CustomDetector> = [
  { detect: detectEslint, key: 'eslint' },
  { detect: detectOxlint, key: 'oxlint' },
  { detect: detectOxfmt, key: 'oxfmt' },
  { detect: detectGitHubWorkflows, key: 'githubWorkflows' },
  { detect: detectChangeset, key: 'changeset' },
  { detect: detectAgentsMd, key: 'agentsMd' },
];

// ── Unified detection runner ──

async function detectFileConfig(
  cwd: string,
  spec: FileDetectorSpec
): Promise<boolean> {
  if (spec.extensions.length === 0) {
    return fileExists(resolvePath(cwd, spec.basename));
  }
  return findConfigFile(cwd, spec.basename, spec.extensions).then(Boolean);
}

async function detectExistingConfigs(
  cwd: string,
  deps?: Record<string, string>
): Promise<ProjectProfile['existing']> {
  const fileResults = await Promise.all(
    FILE_DETECTORS.map((d) => detectFileConfig(cwd, d))
  );
  const customResults = await Promise.all(
    CUSTOM_DETECTORS.map((d) => d.detect(cwd, deps))
  );
  const existing: Partial<ProjectProfile['existing']> = {};
  for (let i = 0; i < FILE_DETECTORS.length; i++) {
    (existing as Record<string, unknown>)[FILE_DETECTORS[i].key] =
      fileResults[i];
  }
  for (let i = 0; i < CUSTOM_DETECTORS.length; i++) {
    (existing as Record<string, unknown>)[CUSTOM_DETECTORS[i].key] =
      customResults[i];
  }
  return existing as ProjectProfile['existing'];
}

async function detectNodeVersion(cwd: string): Promise<string> {
  const nvmrcPath = resolvePath(cwd, '.nvmrc');
  const nvmrcExists = await fileExists(nvmrcPath);
  if (nvmrcExists) {
    const content = await readFile(nvmrcPath);
    const match = content.trim().match(/^v?(\d+)/);
    if (match) {
      return match[1];
    }
  }

  const pkg = await readPackageJson(cwd);
  const enginesNode = pkg?.engines?.node;
  if (enginesNode) {
    const match = String(enginesNode).match(/\d+/);
    if (match) {
      return match[0];
    }
  }

  return '22';
}

// ── Shared base profile fields ──

async function computeBaseProfile(cwd: string): Promise<{
  monorepo: boolean;
  monorepoTool: 'turbo' | 'nx' | 'lerna' | null;
  workspaceRoot: boolean;
  nodeVersion: string;
  hasGitHub: boolean;
  hasGit: boolean;
  existing: ProjectProfile['existing'];
  packageManager: PackageManager;
}> {
  const [monorepoInfo, hasGitHub, hasGit, packageManager, nodeVersion] =
    await Promise.all([
      detectMonorepo(cwd),
      fileExists(resolvePath(cwd, '.github')),
      fileExists(resolvePath(cwd, '.git')),
      detectPackageManager(cwd),
      detectNodeVersion(cwd),
    ]);

  const existing = await detectExistingConfigs(cwd);

  return {
    existing,
    hasGit,
    hasGitHub,
    monorepo: monorepoInfo.monorepo,
    monorepoTool: monorepoInfo.monorepoTool,
    nodeVersion,
    packageManager,
    workspaceRoot: monorepoInfo.workspaceRoot,
  };
}

// ── Internal detection logic (no caching) ──

async function computeProjectProfile(cwd: string): Promise<ProjectProfile> {
  const base = await computeBaseProfile(cwd);
  const pkg = await readPackageJson(cwd);

  if (!pkg) {
    return {
      bundler: null,
      framework: null,
      frameworkVersion: null,
      router: null,
      runtime: 'node',
      styling: ['vanilla'],
      typescript: base.existing.tsconfig,
      vitePlus: false,
      ...base,
    };
  }

  const allDeps: Record<string, string> = {};
  if (isStringRecord(pkg.dependencies)) {
    Object.assign(allDeps, pkg.dependencies);
  }
  if (isStringRecord(pkg.devDependencies)) {
    Object.assign(allDeps, pkg.devDependencies);
  }

  const framework = detectFramework(allDeps);
  const bundler = await detectBundler(allDeps, cwd);
  const typescript =
    'typescript' in allDeps ||
    (await fileExists(resolvePath(cwd, 'tsconfig.json')));

  return {
    bundler,
    framework,
    frameworkVersion: detectFrameworkVersion(pkg, framework),
    router: detectRouter(allDeps, bundler),
    runtime: detectRuntime(framework, bundler),
    styling: detectStyling(allDeps),
    typescript,
    vitePlus: detectVitePlus(allDeps),
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
    version: 2,
  });

  return profile;
}
