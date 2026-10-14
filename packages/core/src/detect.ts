import { readdir } from 'node:fs/promises';
import type { PackageJson } from 'pkg-types';

import {
  fileExists,
  findConfigFile,
  readFile,
  resolvePath,
} from '@/utils/fs.js';
import { collectDependencyVersions, readPackageJson } from '@/utils/pkg.js';

import { detectBundler } from './detect/bundler.js';
import { detectMonorepo } from './detect/monorepo.js';
import { detectPackageManager } from './detect/package-manager.js';
import type {
  Bundler,
  ExistingConfig,
  Framework,
  PackageManager,
  ProjectProfile,
  Router,
  Styling,
} from './detect/types.js';

export type { Framework, PackageManager, ProjectProfile };
export { detectPackageManager };

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
  return 'browser';
}

function detectVitePlus(deps: Record<string, string>): boolean {
  return 'vite-plus' in deps || 'vp' in deps;
}

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

const JSON_EXTENSIONS = ['.json', '.jsonc'];
const SCRIPT_EXTENSIONS = ['.ts', '.js', '.mjs'];

async function hasConfig(
  cwd: string,
  baseName: string,
  extensions: Array<string>
): Promise<boolean> {
  return Boolean(await findConfigFile(cwd, baseName, extensions));
}

async function detectGitHubWorkflows(cwd: string): Promise<Array<string>> {
  const workflowsDir = resolvePath(cwd, '.github', 'workflows');
  if (!(await fileExists(workflowsDir))) {
    return [];
  }
  const entries = await readdir(workflowsDir);
  return entries
    .filter((e) => e.endsWith('.yml') || e.endsWith('.yaml'))
    .map((e) => e.replace(/\.(yml|yaml)$/, ''));
}

async function detectExistingConfigs(
  cwd: string,
  deps: Record<string, string>
): Promise<ExistingConfig> {
  const has = (baseName: string, extensions: Array<string>) =>
    hasConfig(cwd, baseName, extensions);
  const [
    biome,
    tsconfig,
    turbo,
    eslintrc,
    eslintConfig,
    oxlintrc,
    oxlintConfig,
    oxfmtrc,
    oxfmtConfig,
    agentsMd,
    claudeMd,
    changesetConfig,
    githubWorkflows,
  ] = await Promise.all([
    has('biome', JSON_EXTENSIONS),
    has('tsconfig', JSON_EXTENSIONS),
    has('turbo', ['.json']),
    has('.eslintrc', ['.js', '.cjs', '.mjs', '.json', '.yaml', '.yml']),
    has('eslint.config', ['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts']),
    has('.oxlintrc', JSON_EXTENSIONS),
    has('oxlint.config', SCRIPT_EXTENSIONS),
    has('.oxfmtrc', JSON_EXTENSIONS),
    has('oxfmt.config', SCRIPT_EXTENSIONS),
    has('AGENTS', ['.md']),
    has('CLAUDE', ['.md']),
    fileExists(resolvePath(cwd, '.changeset', 'config.json')),
    detectGitHubWorkflows(cwd),
  ]);
  return {
    agentsMd: agentsMd || claudeMd,
    biome,
    changeset: changesetConfig || Boolean(deps['@changesets/cli']),
    eslint: eslintrc || eslintConfig || Boolean(deps.eslint),
    githubWorkflows,
    oxfmt: oxfmtrc || oxfmtConfig,
    oxlint: oxlintrc || oxlintConfig,
    tsconfig,
    turbo,
  };
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

export async function detectProject(cwd: string): Promise<ProjectProfile> {
  const pkg = await readPackageJson(cwd);
  const deps = collectDependencyVersions(pkg);

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
    router: detectRouter(deps, bundler),
    runtime: detectRuntime(framework, bundler),
    styling: detectStyling(deps),
    typescript,
    vitePlus: detectVitePlus(deps),
    ...base,
  };
}
