// Centralized detection types

import type { ExistingConfig } from './registry/index.js';

export type Framework =
  | 'react'
  | 'react-native'
  | 'vue'
  | 'svelte'
  | 'solid'
  | 'node'
  | null;

export type Bundler =
  | 'vite'
  | 'nextjs'
  | 'tanstack-start'
  | 'expo'
  | 'webpack'
  | 'rspack'
  | 'none'
  | null;

export type Router =
  | 'tanstack-router'
  | 'react-router'
  | 'next'
  | 'expo-router'
  | 'vue-router'
  | null;

export type Styling =
  | 'tailwind'
  | 'css-modules'
  | 'styled-components'
  | 'vanilla-extract'
  | 'nativewind'
  | 'vanilla';

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

export interface MonorepoDetection {
  monorepo: boolean;
  monorepoTool: 'turbo' | 'nx' | 'lerna' | null;
  workspaceRoot: boolean;
}

export interface ProjectProfile {
  bundler: Bundler;
  existing: ExistingConfig;
  framework: Framework;
  frameworkVersion: string | null;
  hasGit: boolean;
  hasGitHub: boolean;
  monorepo: boolean;
  monorepoTool: 'turbo' | 'nx' | 'lerna' | null;
  nodeVersion: string;
  packageManager: PackageManager;
  router: Router;
  runtime: 'browser' | 'node' | 'edge' | 'native' | 'universal';
  styling: Array<Styling>;
  typescript: boolean;
  vitePlus: boolean;
  workspaceRoot: boolean;
}
