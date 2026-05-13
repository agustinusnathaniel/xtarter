// Centralized detection types

export type Framework =
	| 'react'
	| 'react-native'
	| 'vue'
	| 'svelte'
	| 'solid'
	| 'node'
	| null

export type Bundler =
	| 'vite'
	| 'nextjs'
	| 'tanstack-start'
	| 'expo'
	| 'webpack'
	| 'rspack'
	| 'none'
	| null

export type Router =
	| 'tanstack-router'
	| 'react-router'
	| 'next'
	| 'expo-router'
	| 'vue-router'
	| null

export type Styling =
	| 'tailwind'
	| 'css-modules'
	| 'styled-components'
	| 'vanilla-extract'
	| 'nativewind'
	| 'vanilla'

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun'

export interface MonorepoDetection {
	monorepo: boolean
	monorepoTool: 'turbo' | 'nx' | 'lerna' | null
	workspaceRoot: boolean
}

export interface ProjectProfile {
	framework: Framework
	frameworkVersion: string | null
	bundler: Bundler
	router: Router
	styling: Styling[]
	typescript: boolean
	runtime: 'browser' | 'node' | 'edge' | 'native' | 'universal'
	packageManager: PackageManager
	vitePlus: boolean
	monorepo: boolean
	monorepoTool: 'turbo' | 'nx' | 'lerna' | null
	workspaceRoot: boolean
	nodeVersion: string
	hasGitHub: boolean
	hasGit: boolean
	existing: {
		biome: boolean
		oxlint: boolean
		oxfmt: boolean
		eslint: boolean
		tsconfig: boolean
		renovate: boolean
		commitlint: boolean
		knip: boolean
		plop: boolean
		turbo: boolean
		vscodeSettings: boolean
		agentsMd: boolean
		githubWorkflows: string[]
		viteConfig: boolean
		versionrc: boolean
		gitignore: boolean
		changeset: boolean
	}
}
