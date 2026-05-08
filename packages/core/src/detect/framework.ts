import type { Bundler, Framework } from './types.js'

/**
 * Detects the frontend framework from package dependencies
 * @param deps - Record of package names to versions
 * @returns Detected framework or null if ambiguous/undetectable
 */
export function detectFramework(deps: Record<string, string>): Framework {
	const hasReactNative = !!(deps['react-native'] || deps.expo)
	const hasReact = !!deps.react
	const hasVue = !!deps.vue
	const hasSvelte = !!deps.svelte
	const hasSolid = !!deps['solid-js']

	if (hasReactNative && hasReact) {
		return null // ambiguous, will be resolved by prompt
	}
	if (hasReactNative) return 'react-native'
	if (hasReact) return 'react'
	if (hasVue) return 'vue'
	if (hasSvelte) return 'svelte'
	if (hasSolid) return 'solid'
	return 'node'
}

/**
 * Detects runtime environment from framework and bundler
 * @param framework - Detected framework
 * @param bundler - Detected bundler
 * @returns Runtime environment
 */
export function detectRuntime(
	framework: Framework,
	bundler: Bundler,
): 'browser' | 'node' | 'edge' | 'native' | 'universal' {
	if (framework === 'react-native') return 'native'
	if (bundler === 'expo') return 'native'
	if (bundler === 'nextjs') return 'edge'
	if (bundler === 'tanstack-start') return 'edge'
	if (bundler === 'vite' || bundler === 'webpack' || bundler === 'rspack')
		return 'browser'
	if (framework === 'node') return 'node'
	return 'browser'
}

/**
 * Detects Vite+ usage from dependencies
 * @param deps - Record of package names to versions
 * @returns True if Vite+ is detected
 */
export function detectVitePlus(deps: Record<string, string>): boolean {
	return 'vite-plus' in deps || 'vp' in deps
}
